import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { User, Group } from "@/types";

interface Props {
  show: boolean;
  selectedCount: number;
  users: User[];
  groups: Group[];
  forwardTargets: string[];
  setForwardTargets: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onSend: () => void;
}

export default function ForwardModal({ show, selectedCount, users, groups, forwardTargets, setForwardTargets, onClose, onSend }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center" onClick={onClose}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-xl w-[420px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-800">Forward message</h3>
                <p className="text-xs text-gray-500">{selectedCount} message(s) selected</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {groups.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Groups</div>
                  {groups.map(group => (
                    <label key={`fwd-g-${group.id}`} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${forwardTargets.includes(group.id) ? "bg-[#e7fce3]" : ""}`}>
                      <input type="checkbox" checked={forwardTargets.includes(group.id)} onChange={(e) => { if (e.target.checked) setForwardTargets(prev => [...prev, group.id]); else setForwardTargets(prev => prev.filter(id => id !== group.id)); }} className="w-4 h-4 accent-[#00a884]" />
                      <img src={group.avatar} alt={group.name} className="w-10 h-10 rounded-full object-cover object-center bg-gray-100" />
                      <span className="font-medium text-gray-800">{group.name}</span>
                    </label>
                  ))}
                </>
              )}

              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Users</div>
              {users.map(user => (
                <label key={`fwd-u-${user.id}`} className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${forwardTargets.includes(user.id) ? "bg-[#e7fce3]" : ""}`}>
                  <input type="checkbox" checked={forwardTargets.includes(user.id)} onChange={(e) => { if (e.target.checked) setForwardTargets(prev => [...prev, user.id]); else setForwardTargets(prev => prev.filter(id => id !== user.id)); }} className="w-4 h-4 accent-[#00a884]" />
                  <div className="relative">
                    <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full object-cover object-center bg-gray-100" />
                    {user.status === "online" && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}
                  </div>
                  <span className="font-medium text-gray-800">{user.username}</span>
                </label>
              ))}
            </div>

            {forwardTargets.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {forwardTargets.map(tid => {
                    const g = groups.find(g => g.id === tid);
                    const u = users.find(u => u.id === tid);
                    const name = g?.name || u?.username || tid;
                    return (
                      <span key={tid} className="bg-[#e7fce3] text-[#008069] text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        {name}
                        <button onClick={() => setForwardTargets(prev => prev.filter(id => id !== tid))} className="hover:text-red-500">&times;</button>
                      </span>
                    );
                  })}
                </div>
                <button onClick={onSend} className="w-full bg-[#00a884] text-white py-2.5 rounded-lg font-semibold hover:bg-[#008069] transition-colors">
                  Forward to {forwardTargets.length} chat(s)
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
