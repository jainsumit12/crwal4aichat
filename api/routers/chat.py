from fastapi import APIRouter, Body, Query, HTTPException, status, Path, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import uuid

# Import from main project
from chat import ChatBot

# Create router
router = APIRouter()

# Define models
class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    profile: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    user_id: Optional[str] = None
    context: Optional[List[Dict[str, Any]]] = None
    conversation_history: Optional[List[Message]] = None

class ProfileResponse(BaseModel):
    name: str
    description: str
    is_active: bool

class ProfileListResponse(BaseModel):
    profiles: List[ProfileResponse]
    count: int
    active_profile: str

class ConversationHistoryResponse(BaseModel):
    messages: List[Message]
    count: int
    session_id: str
    user_id: Optional[str] = None

# Dependency to get a ChatBot instance
def get_chat_bot(
    model: Optional[str] = None,
    result_limit: Optional[int] = None,
    similarity_threshold: Optional[float] = None,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    profile: str = "default",
):
    try:
        return ChatBot(
            model=model,
            result_limit=result_limit,
            similarity_threshold=similarity_threshold,
            session_id=session_id,
            user_id=user_id,
            profile=profile,
            verbose=False  # Always use quiet mode for API
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing ChatBot: {str(e)}"
        )

@router.post("/", response_model=ChatResponse)
async def chat(
    chat_request: ChatRequest = Body(...),
    model: Optional[str] = Query(None, description="The model to use for chat"),
    result_limit: Optional[int] = Query(None, description="Maximum number of search results"),
    similarity_threshold: Optional[float] = Query(None, description="Similarity threshold (0-1)"),
    include_context: bool = Query(False, description="Include search context in the response"),
    include_history: bool = Query(False, description="Include conversation history in the response"),
):
    """
    Send a message to the chat bot and get a response.
    
    - **message**: The user's message
    - **session_id**: Optional session ID for persistent conversations
    - **user_id**: Optional user ID
    - **profile**: Optional profile to use
    - **model**: Optional model to use
    - **result_limit**: Optional maximum number of search results
    - **similarity_threshold**: Optional similarity threshold (0-1)
    - **include_context**: Whether to include search context in the response
    - **include_history**: Whether to include conversation history in the response
    """
    try:
        # Generate a session ID if not provided
        session_id = chat_request.session_id or str(uuid.uuid4())
        
        # Initialize ChatBot
        chat_bot = get_chat_bot(
            model=model,
            result_limit=result_limit,
            similarity_threshold=similarity_threshold,
            session_id=session_id,
            user_id=chat_request.user_id,
            profile=chat_request.profile or "default"
        )
        
        # Get response
        response = chat_bot.get_response(chat_request.message)
        
        # Prepare the response
        chat_response = {
            "response": response,
            "session_id": session_id,
            "user_id": chat_request.user_id
        }
        
        # Include context if requested
        if include_context:
            # Get the most recent search context
            context = chat_bot.search_for_context(chat_request.message)
            chat_response["context"] = context
        
        # Include conversation history if requested
        if include_history:
            # Load conversation history
            chat_bot.load_conversation_history()
            
            # Convert to Message model
            messages = []
            for msg in chat_bot.conversation_history:
                messages.append(Message(
                    role=msg["role"],
                    content=msg["content"],
                    timestamp=msg.get("timestamp")
                ))
            
            chat_response["conversation_history"] = messages
        
        return chat_response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in chat: {str(e)}"
        )

@router.get("/profiles", response_model=ProfileListResponse)
async def list_profiles(
    session_id: Optional[str] = Query(None, description="Session ID to get active profile"),
    user_id: Optional[str] = Query(None, description="User ID")
):
    """
    List all available profiles.
    
    - **session_id**: Optional session ID to get active profile
    - **user_id**: Optional user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(
            session_id=session_id,
            user_id=user_id
        )
        
        # Get profiles
        profiles = chat_bot.profiles
        active_profile = chat_bot.current_profile
        
        # Convert to ProfileResponse model
        profile_list = []
        for name, profile in profiles.items():
            profile_list.append(ProfileResponse(
                name=name,
                description=profile.get("description", ""),
                is_active=(name == active_profile)
            ))
        
        return ProfileListResponse(
            profiles=profile_list,
            count=len(profile_list),
            active_profile=active_profile
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing profiles: {str(e)}"
        )

@router.post("/profiles/{profile_name}", response_model=Dict[str, Any])
async def set_profile(
    profile_name: str = Path(..., description="The name of the profile to set"),
    session_id: str = Query(..., description="Session ID"),
    user_id: Optional[str] = Query(None, description="User ID")
):
    """
    Set the active profile for a session.
    
    - **profile_name**: The name of the profile to set
    - **session_id**: Session ID
    - **user_id**: Optional user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(
            session_id=session_id,
            user_id=user_id
        )
        
        # Set profile
        chat_bot.set_profile(profile_name)
        
        return {
            "message": f"Profile set to {profile_name}",
            "session_id": session_id,
            "user_id": user_id,
            "profile": profile_name
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting profile: {str(e)}"
        )

@router.get("/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    session_id: str = Query(..., description="Session ID"),
    user_id: Optional[str] = Query(None, description="User ID")
):
    """
    Get conversation history for a session.
    
    - **session_id**: Session ID
    - **user_id**: Optional user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(
            session_id=session_id,
            user_id=user_id
        )
        
        # Load conversation history
        chat_bot.load_conversation_history()
        
        # Convert to Message model
        messages = []
        for msg in chat_bot.conversation_history:
            messages.append(Message(
                role=msg["role"],
                content=msg["content"],
                timestamp=msg.get("timestamp")
            ))
        
        return ConversationHistoryResponse(
            messages=messages,
            count=len(messages),
            session_id=session_id,
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting conversation history: {str(e)}"
        )

@router.delete("/history", response_model=Dict[str, Any])
async def clear_conversation_history(
    session_id: str = Query(..., description="Session ID"),
    user_id: Optional[str] = Query(None, description="User ID")
):
    """
    Clear conversation history for a session.
    
    - **session_id**: Session ID
    - **user_id**: Optional user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(
            session_id=session_id,
            user_id=user_id
        )
        
        # Clear conversation history
        chat_bot.clear_conversation_history()
        
        return {
            "message": "Conversation history cleared",
            "session_id": session_id,
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing conversation history: {str(e)}"
        ) 