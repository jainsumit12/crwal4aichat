import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserPreferences from '../components/UserPreferences';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

const UserPreferencesPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string>(userId || '');
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get the session ID from local storage if available
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentUserId(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }
    navigate(`/preferences/${currentUserId}`);
  };

  const handlePreferenceChange = () => {
    // This function will be called when preferences are changed
    // You can add additional logic here if needed
    toast.success('Preferences updated');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">User Preferences</h1>
      
      <Card className="mb-6 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <label htmlFor="userId" className="block mb-2 font-medium">
              User ID
            </label>
            <Input
              id="userId"
              type="text"
              value={currentUserId}
              onChange={handleUserIdChange}
              placeholder="Enter user ID"
              className="w-full"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isLoading || !currentUserId.trim()}>
              Load Preferences
            </Button>
          </div>
        </form>
      </Card>

      {userId ? (
        <UserPreferences 
          userId={userId} 
          sessionId={sessionId}
          onPreferenceChange={handlePreferenceChange}
        />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">Enter a user ID to view and manage preferences.</p>
          <p className="text-sm text-gray-500">
            Preferences are tied to user IDs and persist across chat sessions.
          </p>
        </Card>
      )}
    </div>
  );
};

export default UserPreferencesPage; 