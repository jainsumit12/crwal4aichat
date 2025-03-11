import React, { useState, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateName, updateAvatar, addPreference, removePreference, clearPreferences } = useUser();
  const [name, setName] = useState(userProfile.name);
  const [newPreference, setNewPreference] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateName(name);
    onClose();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateAvatar(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPreference = () => {
    if (newPreference.trim()) {
      addPreference(newPreference.trim());
      setNewPreference('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6 flex flex-col items-center">
            <div 
              className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-700 mb-4 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {userProfile.avatar ? (
                <img 
                  src={userProfile.avatar} 
                  alt={userProfile.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl text-gray-500 dark:text-gray-400">
                  {userProfile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change Avatar
            </button>
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Your name"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Preferences
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPreference}
                onChange={(e) => setNewPreference(e.target.value)}
                className="input flex-1"
                placeholder="Add a preference (e.g., 'I like Docker')"
              />
              <button
                type="button"
                onClick={handleAddPreference}
                className="btn-secondary px-3 py-1"
                disabled={!newPreference.trim()}
              >
                Add
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {userProfile.preferences.map((pref, index) => (
                <div 
                  key={index}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  {pref}
                  <button
                    type="button"
                    onClick={() => removePreference(pref)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {userProfile.preferences.length > 0 && (
                <button
                  type="button"
                  onClick={clearPreferences}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal; 