from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from .models import MessageRole


# Conversation Schemas

class ConversationBase(BaseModel):
    title: Optional[str] = Field(None, description="Optional human-friendly title for the conversation")


# PUBLIC_INTERFACE
class ConversationCreate(ConversationBase):
    """
    Request schema for creating a new conversation.
    """
    pass


# PUBLIC_INTERFACE
class MessageRead(BaseModel):
    """
    Response schema for reading a single message.
    """
    id: int = Field(..., description="Unique identifier of the message")
    role: MessageRole = Field(..., description="Role of the message author: user or assistant")
    content: str = Field(..., description="Message content text")
    created_at: datetime = Field(..., description="Creation timestamp (UTC)")

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy


# PUBLIC_INTERFACE
class ConversationRead(ConversationBase):
    """
    Response schema for reading a conversation (optionally with messages).
    """
    id: int = Field(..., description="Unique identifier of the conversation")
    created_at: datetime = Field(..., description="Creation timestamp (UTC)")
    messages: Optional[List[MessageRead]] = Field(None, description="Messages in this conversation")

    class Config:
        from_attributes = True  # Enable ORM mode for SQLAlchemy


# Message Schemas

class MessageBase(BaseModel):
    content: str = Field(..., description="User input or assistant response text")


# PUBLIC_INTERFACE
class MessageCreate(MessageBase):
    """
    Request schema for creating/sending a new message.
    """
    role: MessageRole = Field(MessageRole.USER, description="Role of the message; typically 'user' for new messages")


# PUBLIC_INTERFACE
class MessageOnlyRead(MessageRead):
    """
    An alias for MessageRead when listing without conversation context.
    """
    pass
