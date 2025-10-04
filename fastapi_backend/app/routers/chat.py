from typing import AsyncGenerator, Callable, Dict, List, Optional

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse

from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Conversation, Message, MessageRole
from ..schemas import ConversationCreate, ConversationRead, MessageCreate, MessageRead
from ..services.openai_client import OpenAIService
from ..config import get_settings

router = APIRouter(prefix="", tags=["Conversations"])


def _conversation_to_read(conv: Conversation, include_messages: bool = False) -> Dict:
    data = {
        "id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at,
    }
    if include_messages:
        data["messages"] = [
            {
                "id": m.id,
                "role": m.role.value if hasattr(m.role, "value") else str(m.role),
                "content": m.content,
                "created_at": m.created_at,
            }
            for m in (conv.messages or [])
        ]
    return data


@router.get(
    "/conversations",
    response_model=List[ConversationRead],
    summary="List conversations",
    description="Returns conversations ordered by creation date descending.",
)
def list_conversations(db: Session = Depends(get_db)):
    convs = db.query(Conversation).order_by(Conversation.created_at.desc()).all()
    return [_conversation_to_read(c, include_messages=False) for c in convs]


@router.post(
    "/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a conversation",
    description="Creates a new conversation with an optional title.",
)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db)):
    conv = Conversation(title=(payload.title or None), created_at=datetime.utcnow())
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return _conversation_to_read(conv, include_messages=False)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationRead,
    summary="Get a conversation",
    description="Returns a single conversation with its messages.",
)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    # messages relationship has order_by asc set on model
    return _conversation_to_read(conv, include_messages=True)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
    description="Deletes a conversation and its messages.",
)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# PUBLIC_INTERFACE
@router.post(
    "/conversations/{conversation_id}/messages",
    summary="Send a message to a conversation",
    description="""
    Send a user message to a conversation and get an assistant reply.
    - If stream=true, responds with Server-Sent Events (text/event-stream) yielding incremental tokens.
    - If stream=false (default), responds with JSON containing full assistant reply.
    """,
)
async def send_message(
    conversation_id: int,
    payload: Dict,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Route to send a message. Supports streaming using SSE:
      - Request body: {"content": string, "stream": boolean}
      - Response:
         - stream=true: 'text/event-stream' with `data: <token>` lines and final `data: [DONE]`.
         - stream=false: JSON with {"assistant_reply": "<full text>"}.
    """
    # Validate conversation
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    content: str = (payload or {}).get("content", "")
    stream: bool = bool((payload or {}).get("stream", False))
    if not content or not isinstance(content, str):
        raise HTTPException(status_code=400, detail="content is required")

    # Persist user message
    user_msg = Message(
        conversation_id=conversation_id,
        role=MessageRole.USER,
        content=content,
        created_at=datetime.utcnow(),
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Auto-title conversation if missing
    if not conv.title:
        # naive title from first 60 chars of first message
        snippet = content.strip().splitlines()[0][:60]
        conv.title = snippet or f"Conversation {conv.id}"
        db.add(conv)
        db.commit()

    # Build message history for model
    messages = []
    for m in conv.messages:
        messages.append({"role": m.role.value if hasattr(m.role, "value") else str(m.role), "content": m.content})

    # Ensure API key exists
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    oaiclient = OpenAIService()

    if not stream:
        # Non-streaming
        assistant_text: str = await oaiclient.complete(messages=messages, stream=False)  # type: ignore
        # Save assistant message
        asst_msg = Message(
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=assistant_text,
            created_at=datetime.utcnow(),
        )
        db.add(asst_msg)
        db.commit()
        db.refresh(asst_msg)
        return JSONResponse({"assistant_reply": assistant_text})

    # Streaming SSE
    async def event_generator() -> AsyncGenerator[bytes, None]:
        # Insert placeholder assistant message that we append to
        asst_accum: List[str] = []
        async for delta in (await oaiclient.complete(messages=messages, stream=True)):  # type: ignore
            if await request.is_disconnected():
                break
            if delta:
                asst_accum.append(delta)
                yield f"data: {delta}\n\n".encode("utf-8")
        # Persist final assistant message
        final_text = "".join(asst_accum)
        if final_text:
            asst_msg = Message(
                conversation_id=conversation_id,
                role=MessageRole.ASSISTANT,
                content=final_text,
                created_at=datetime.utcnow(),
            )
            db.add(asst_msg)
            db.commit()
        # Signal completion
        yield b"data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
