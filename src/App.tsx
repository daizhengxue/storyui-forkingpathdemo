import React from 'react';
import { AdminUI } from './pages/AdminUI';
import { StoryUI } from './pages/StoryUI';
import { useDialogueStore } from './store/dialogueStore';

const App: React.FC = () => {
  const { reset, isAdmin, setIsAdmin } = useDialogueStore();

  React.useEffect(() => {
    reset();
  }, []);

  return (
    <>
      {isAdmin ? (
        <AdminUI />
      ) : (
        <div className="relative">
          <StoryUI />
          <button
            onClick={() => setIsAdmin(true)}
            className="fixed bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
          >
            ⚙️
          </button>
        </div>
      )}
    </>
  );
};

export default App;