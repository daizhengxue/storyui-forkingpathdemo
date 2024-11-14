import React, { useState } from 'react';
import { useDialogueStore } from '../store/dialogueStore';
import { Loader2, GitBranch } from 'lucide-react';
import { DialogueInput } from '../components/DialogueInput';
import { DialogueMessage } from '../types/dialogue';
import { TypingEffect } from '../components/TypingEffect';
import { HistorySelector } from '../components/HistorySelector';

export const StoryUI = () => {
  const { nodes, currentState, getDialogueHistory } = useDialogueStore();
  const [isTyping, setIsTyping] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  const currentNode = nodes.get(currentState.currentNodeId);
  const currentNodeMessages = currentNode ? currentNode.messages : [];
  const displayMessages = currentNode ? getDialogueHistory(currentNode.id) : [];
  
  const aiMessages = currentNodeMessages.filter(msg => msg.role === 'assistant');
  const lastAiMessage = aiMessages[aiMessages.length - 1];

  const getBranchingMessages = (allMessages: DialogueMessage[], selectedIndex: number | null) => {
    if (selectedIndex === null) {
      return allMessages;
    }

    let messageCount = 0;
    let cutoffIndex = 0;
    
    for (let i = 0; i < allMessages.length; i++) {
      if (allMessages[i].role === 'user') {
        if (messageCount === selectedIndex) {
          cutoffIndex = i + 2;
          break;
        }
        messageCount++;
      }
    }

    return allMessages.slice(0, cutoffIndex);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Story Display */}
      <div className="flex-1 p-4 sm:p-8 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
          {displayMessages.map((msg, idx) => (
            msg.role !== 'system' && (
              <div key={idx} className="animate-fadeIn">
                {msg.role === 'user' ? (
                  <div className="text-blue-400 mb-3 sm:mb-4 text-sm sm:text-base">
                    › {msg.content}
                  </div>
                ) : (
                  idx === displayMessages.length - 1 && isTyping ? (
                    <TypingEffect 
                      text={msg.content} 
                      speed={20}
                      onComplete={() => setIsTyping(false)}
                    />
                  ) : (
                    <div className="font-serif leading-relaxed text-sm sm:text-base">
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} className="mb-3 sm:mb-4">{line}</p>
                      ))}
                    </div>
                  )
                )}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="border-t border-gray-800 sticky bottom-0 bg-black">
        <div className="max-w-2xl mx-auto w-full">
          <DialogueInput 
            customClassName="bg-black text-white"
            onTypingStart={() => setIsTyping(true)}
            renderCustomUI={(props) => (
              <div className="p-3 sm:p-4 space-y-3">
                {lastAiMessage && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        props.setIsBranching(!props.isBranching);
                        if (!props.isBranching) {
                          setSelectedHistoryIndex(null);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs sm:text-sm transition-colors ${
                        props.isBranching 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <GitBranch className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">
                        {props.isBranching ? 'Creating Branch' : 'Create Branch'}
                      </span>
                      <span className="sm:hidden">
                        {props.isBranching ? 'Branching' : 'Branch'}
                      </span>
                    </button>
                  </div>
                )}
                
                {props.isBranching && currentNodeMessages.length > 2 && (
                  <div className="max-h-48 sm:max-h-60 overflow-y-auto">
                    <HistorySelector
                      messages={getBranchingMessages(currentNodeMessages, selectedHistoryIndex)}
                      onSelect={setSelectedHistoryIndex}
                      selectedIndex={selectedHistoryIndex}
                    />
                  </div>
                )}

                <div className="flex gap-2 sm:gap-4">
                  <input
                    type="text"
                    value={props.content}
                    onChange={(e) => props.setContent(e.target.value)}
                    disabled={props.isLoading}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder={props.isBranching 
                      ? selectedHistoryIndex !== null
                        ? "Enter alternative..."
                        : "Enter new branch..."
                      : "What would you like to do?"}
                  />
                  <button
                    onClick={props.handleSubmit}
                    disabled={props.isLoading || !props.content.trim()}
                    className={`px-4 sm:px-6 py-2 text-white rounded text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      props.isBranching 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {props.isLoading ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};