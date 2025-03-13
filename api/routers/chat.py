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
    
    class Config:
        arbitrary_types_allowed = True
        
    @classmethod
    def from_dict(cls, message_dict):
        """Create a Message from a dictionary, converting datetime to string if needed."""
        if 'timestamp' in message_dict and message_dict['timestamp'] is not None:
            if not isinstance(message_dict['timestamp'], str):
                message_dict['timestamp'] = str(message_dict['timestamp'])
        return cls(**message_dict)

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

class UserPreference(BaseModel):
    id: Optional[int] = None
    preference_type: str
    preference_value: str
    context: Optional[str] = None
    confidence: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_used: Optional[str] = None
    source_session: Optional[str] = None
    is_active: bool = True
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        arbitrary_types_allowed = True
        
    @classmethod
    def from_dict(cls, pref_dict):
        """Create a UserPreference from a dictionary, converting datetime to string if needed."""
        for date_field in ['created_at', 'updated_at', 'last_used']:
            if date_field in pref_dict and pref_dict[date_field] is not None:
                if not isinstance(pref_dict[date_field], str):
                    pref_dict[date_field] = str(pref_dict[date_field])
        return cls(**pref_dict)

class UserPreferenceCreate(BaseModel):
    preference_type: str
    preference_value: str
    context: Optional[str] = None
    confidence: float = 0.9
    metadata: Optional[Dict[str, Any]] = None

class UserPreferenceResponse(BaseModel):
    preferences: List[UserPreference]
    count: int
    user_id: str

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

@router.post("", response_model=ChatResponse)
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
        # Initialize ChatBot with the specified profile
        chat_bot = get_chat_bot(
            session_id=session_id,
            user_id=user_id,
            profile=profile_name
        )
        
        # Return success response
        return {
            "success": True,
            "message": f"Profile set to {profile_name}",
            "profile": profile_name,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting profile: {str(e)}"
        )

@router.get("/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    session_id: str = Query(..., description="Session ID"),
    user_id: Optional[str] = Query(None, description="User ID"),
):
    """
    Get conversation history for a session.
    
    - **session_id**: The session ID
    - **user_id**: Optional user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(session_id=session_id, user_id=user_id)
        
        # Load conversation history
        chat_bot.load_conversation_history()
        
        # Convert to Message objects
        messages = []
        for msg in chat_bot.conversation_history:
            messages.append(Message.from_dict(msg))
        
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
    user_id: Optional[str] = Query(None, description="User ID"),
):
    """
    Clear conversation history for a session.
    
    - **session_id**: The session ID
    - **user_id**: Optional user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(session_id=session_id, user_id=user_id)
        
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

# User Preferences Endpoints

@router.get("/preferences", response_model=UserPreferenceResponse)
async def get_user_preferences(
    user_id: str = Query(..., description="User ID"),
    min_confidence: float = Query(0.0, description="Minimum confidence score (0-1)"),
    active_only: bool = Query(True, description="Whether to return only active preferences"),
):
    """
    Get preferences for a user.
    
    - **user_id**: The user ID
    - **min_confidence**: Minimum confidence score (0-1) for preferences to return
    - **active_only**: Whether to return only active preferences
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(user_id=user_id)
        
        # Get preferences from the database
        db_preferences = chat_bot.crawler.db_client.get_user_preferences(
            user_id=user_id,
            min_confidence=min_confidence,
            active_only=active_only
        )
        
        # Convert to UserPreference objects
        preferences = [UserPreference.from_dict(pref) for pref in db_preferences]
        
        return UserPreferenceResponse(
            preferences=preferences,
            count=len(preferences),
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user preferences: {str(e)}"
        )

@router.post("/preferences", response_model=UserPreference)
async def create_user_preference(
    user_id: str = Query(..., description="User ID"),
    session_id: Optional[str] = Query(None, description="Session ID"),
    preference: UserPreferenceCreate = Body(...),
):
    """
    Create a new user preference.
    
    - **user_id**: The user ID
    - **session_id**: Optional session ID
    - **preference**: The preference to create
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(user_id=user_id, session_id=session_id)
        
        # Save the preference to the database
        preference_id = chat_bot.crawler.db_client.save_user_preference(
            user_id=user_id,
            preference_type=preference.preference_type,
            preference_value=preference.preference_value,
            context=preference.context,
            confidence=preference.confidence,
            source_session=session_id,
            metadata=preference.metadata
        )
        
        # Get the created preference
        created_preference = chat_bot.crawler.db_client.get_preference_by_id(preference_id)
        
        return UserPreference.from_dict(created_preference)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user preference: {str(e)}"
        )

@router.delete("/preferences/{preference_id}", response_model=Dict[str, Any])
async def delete_user_preference(
    preference_id: int = Path(..., description="The ID of the preference to delete"),
    user_id: str = Query(..., description="User ID"),
):
    """
    Delete a user preference.
    
    - **preference_id**: The ID of the preference to delete
    - **user_id**: The user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(user_id=user_id)
        
        # Get the preference to verify ownership
        preference = chat_bot.crawler.db_client.get_preference_by_id(preference_id)
        
        if not preference:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Preference with ID {preference_id} not found"
            )
        
        if preference.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this preference"
            )
        
        # Delete the preference
        success = chat_bot.crawler.db_client.delete_user_preference(preference_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete preference"
            )
        
        return {
            "message": f"Preference with ID {preference_id} deleted",
            "id": preference_id,
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user preference: {str(e)}"
        )

@router.put("/preferences/{preference_id}/deactivate", response_model=Dict[str, Any])
async def deactivate_user_preference(
    preference_id: int = Path(..., description="The ID of the preference to deactivate"),
    user_id: str = Query(..., description="User ID"),
):
    """
    Deactivate a user preference.
    
    - **preference_id**: The ID of the preference to deactivate
    - **user_id**: The user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(user_id=user_id)
        
        # Get the preference to verify ownership
        preference = chat_bot.crawler.db_client.get_preference_by_id(preference_id)
        
        if not preference:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Preference with ID {preference_id} not found"
            )
        
        if preference.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to deactivate this preference"
            )
        
        # Deactivate the preference
        success = chat_bot.crawler.db_client.deactivate_user_preference(preference_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to deactivate preference"
            )
        
        return {
            "message": f"Preference with ID {preference_id} deactivated",
            "id": preference_id,
            "user_id": user_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating user preference: {str(e)}"
        )

@router.delete("/preferences", response_model=Dict[str, Any])
async def clear_user_preferences(
    user_id: str = Query(..., description="User ID"),
):
    """
    Clear all preferences for a user.
    
    - **user_id**: The user ID
    """
    try:
        # Initialize ChatBot
        chat_bot = get_chat_bot(user_id=user_id)
        
        # Clear preferences
        success = chat_bot.crawler.db_client.clear_user_preferences(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear preferences"
            )
        
        return {
            "message": f"All preferences cleared for user {user_id}",
            "user_id": user_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing user preferences: {str(e)}"
        ) 