import React from 'react';
import { DialogueMessage } from '../types/dialogue';
import { Clock } from 'lucide-react';

interface HistorySelectorProps {
  messages: DialogueMessage[];
  onSelect: (index: number) => void;
  selectedIndex: number | null;
}

export const HistorySelector: React.FC<HistorySelectorProps> = ({
  messages,
  onSelect,
  selectedIndex
}) => {
  const conversationPairs = messages.reduce((pairs: DialogueMessage[][], msg, index) => {
    if (msg.role === 'user') {
      const aiResponse = messages[index + 1];
      if (aiResponse && aiResponse.role === 'assistant') {
        pairs.push([msg, aiResponse]);
      }
    }
    return pairs;
  }, []);

  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 text-gray-400 mb-3">
        <Clock className="w-4 h-4" />
        <span className="text-sm">Select a point to branch from:</span>
      </div>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {conversationPairs.map((pair, index) => {
          const isSelected = selectedIndex === index;
          const [userMsg, aiMsg] = pair;
          
          return (
            <button
              key={index}
              onClick={() => onSelect(index)}
              className={`w-full text-left p-3 rounded transition-colors ${
                isSelected 
                  ? 'bg-green-900 border border-green-700' 
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="text-blue-400 text-sm mb-1">› {userMsg.content}</div>
              <div className="text-gray-300 text-sm line-clamp-2">{aiMsg.content}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};