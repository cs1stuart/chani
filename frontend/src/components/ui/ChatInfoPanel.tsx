import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, UserPlus, Search, Check, LogOut, Trash2 } from "lucide-react";
import { User, Group, Message } from "@/types";
import AvatarViewModal from "@/components/ui/AvatarViewModal";

interface Props {
  show: boolean;
  selectedChat: { type: "user" | "group"; data: User | Group } | null;
  currentUser: User;
  groupMembers: User[];
  allUsers: User[];
  messages: Message[];
  onClose: () => void;
  onAddMembers: (groupId: string, memberIds: string[]) => Promise<void>;
  onExitGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRemoveMember: (groupId: string, memberId: string) => void;
}

export default function ChatInfoPanel({
  show,
  selectedChat,
  currentUser,
  groupMembers,
  allUsers,
  messages,
  onClose,
  onAddMembers,
  onExitGroup,
  onDeleteGroup,
  onRemoveMember,
}: Props) {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  useEffect(() => {
    if (!show) setShowFullAvatar(false);
  }, [show]);

  const existingMemberIds = new Set(groupMembers.map((m) => m.id));
  const availableUsers = allUsers.filter(
    (u) =>
      !existingMemberIds.has(u.id) &&
      u.id !== currentUser.id &&
      u.username.toLowerCase().includes(addSearch.toLowerCase()),
  );

  const handleAdd = async () => {
    if (selectedNewMembers.length === 0 || !selectedChat) return;
    setAdding(true);
    try {
      await onAddMembers(selectedChat.data.id, selectedNewMembers);
      setSelectedNewMembers([]);
      setShowAddMembers(false);
      setAddSearch("");
    } finally {
      setAdding(false);
    }
  };
  return (
    <AnimatePresence>
      {show && selectedChat && (
        <div
          key="chat-info-panel"
          className="fixed inset-0 z-50 flex"
          onClick={onClose}
          role="presentation"
        >
          <div className="flex-1 min-w-0" />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            onClick={(e) => e.stopPropagation()}
            className="w-[400px] max-w-full bg-white shadow-2xl flex flex-col shrink-0"
          >
          <div className="p-4 bg-[#f0f2f5] flex items-center gap-6">
            <button onClick={onClose}>
              <X size={24} />
            </button>
            <span className="text-lg font-semibold">
              {selectedChat.type === "user" ? "Contact Info" : "Group Info"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-8 flex flex-col items-center bg-white mb-2 shadow-sm">
              <button
                type="button"
                onClick={() => setShowFullAvatar(true)}
                className="cursor-pointer rounded-full focus:outline-none"
              >
                <img
                  src={selectedChat.data.avatar}
                  alt="Avatar"
                  className="w-48 h-48 rounded-full object-cover object-center mb-4 bg-gray-200 hover:opacity-90 transition-opacity"
                />
              </button>
              <h2 className="text-2xl font-semibold text-gray-800">
                {selectedChat.type === "user"
                  ? (selectedChat.data as User).username
                  : (selectedChat.data as Group).name}
              </h2>
              {selectedChat.type === "user" && (
                <p className="text-gray-500 mt-1">
                  {(selectedChat.data as User).status === "online"
                    ? "Online"
                    : "Offline"}
                </p>
              )}
            </div>

            {selectedChat.type === "user" &&
              (selectedChat.data as User).about && (
                <div className="p-6 bg-white mb-2 shadow-sm">
                  <h3 className="text-sm text-[#008069] mb-4">About</h3>
                  <p className="text-gray-800">
                    {(selectedChat.data as User).about}
                  </p>
                </div>
              )}

            {selectedChat.type === "group" && (
              <div className="bg-white mb-2 shadow-sm">
                <div className="px-6 pt-5 pb-2 flex items-center justify-between">
                  <h3 className="text-sm text-[#008069] font-medium">
                    {groupMembers.length} members
                  </h3>
                </div>

                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                    <UserPlus size={18} className="text-white" />
                  </div>
                  <span className="font-medium text-[#008069]">Add members</span>
                </button>

                <AnimatePresence>
                  {showAddMembers && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-b border-gray-100"
                    >
                      <div className="p-3">
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search users to add..."
                            value={addSearch}
                            onChange={(e) => setAddSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm outline-none"
                          />
                        </div>

                        {selectedNewMembers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {selectedNewMembers.map((id) => {
                              const u = allUsers.find((x) => x.id === id);
                              return u ? (
                                <span
                                  key={id}
                                  className="flex items-center gap-1 bg-[#e7fce3] text-[#008069] pl-2 pr-1 py-1 rounded-full text-xs font-medium"
                                >
                                  {u.username}
                                  <button
                                    onClick={() => setSelectedNewMembers((p) => p.filter((x) => x !== id))}
                                    className="w-4 h-4 rounded-full bg-[#008069]/20 flex items-center justify-center hover:bg-[#008069]/40"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        <div className="max-h-[200px] overflow-y-auto">
                          {availableUsers.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">
                              {addSearch ? "No users found" : "All users are already members"}
                            </p>
                          ) : (
                            availableUsers.map((user) => {
                              const isSelected = selectedNewMembers.includes(user.id);
                              return (
                                <button
                                  key={user.id}
                                  onClick={() =>
                                    setSelectedNewMembers((p) =>
                                      isSelected ? p.filter((x) => x !== user.id) : [...p, user.id],
                                    )
                                  }
                                  className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                  <div className="relative flex-shrink-0">
                                    <img src={user.avatar} alt={user.username} className="w-9 h-9 rounded-full object-cover object-center bg-gray-100" />
                                    {isSelected && (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center border-2 border-white">
                                        <Check size={10} className="text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <span className={`text-sm truncate ${isSelected ? "font-semibold text-[#008069]" : "text-gray-800"}`}>
                                    {user.username}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>

                        {selectedNewMembers.length > 0 && (
                          <button
                            onClick={handleAdd}
                            disabled={adding}
                            className="w-full mt-2 bg-[#00a884] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-[#008f70] transition-colors"
                          >
                            {adding ? "Adding..." : `Add ${selectedNewMembers.length} member${selectedNewMembers.length > 1 ? "s" : ""}`}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-h-[300px] overflow-y-auto">
                  {groupMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-6 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.username}
                          className="w-10 h-10 rounded-full object-cover object-center bg-gray-100"
                        />
                        {member.status === "online" && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 truncate">
                            {member.id === currentUser.id
                              ? "You"
                              : member.username}
                          </span>
                          {member.role === "admin" && (
                            <span className="text-[10px] bg-[#e7fce3] text-[#008069] px-1.5 py-0.5 rounded font-semibold uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {member.status === "online" ? "Online" : "Offline"}
                        </p>
                      </div>
                      {selectedChat.type === "group" &&
                        (selectedChat.data as Group).created_by === currentUser.id &&
                        member.id !== currentUser.id &&
                        member.role !== "admin" && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${member.username} from this group?`)) {
                                onRemoveMember((selectedChat.data as Group).id, member.id);
                              }
                            }}
                            className="ml-2 text-red-500 hover:text-red-600"
                            title="Remove from group"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedChat.type === "group" && (() => {
              const group = selectedChat.data as Group;
              const isAdmin = group.created_by === currentUser.id;
              return (
                <div className="bg-white mb-2 shadow-sm">
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to exit this group?")) {
                        onExitGroup(group.id);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-red-50 transition-colors text-red-500"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Exit group</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this group permanently? All messages will be lost.")) {
                          onDeleteGroup(group.id);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-red-50 transition-colors text-red-600 border-t border-gray-100"
                    >
                      <Trash2 size={20} />
                      <span className="font-medium">Delete group</span>
                    </button>
                  )}
                </div>
              );
            })()}

            <div className="p-6 bg-white shadow-sm">
              <h3 className="text-sm text-gray-500 mb-4">
                Media, links and docs
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {messages
                  .filter((m) => m.type === "image")
                  .slice(-6)
                  .map((m) => (
                    <img
                      key={m.id}
                      src={m.content}
                      alt="Media"
                      className="w-full aspect-square object-cover rounded-md cursor-pointer"
                      onClick={() => window.open(m.content)}
                    />
                  ))}
                {messages.filter((m) => m.type === "image").length === 0 && (
                  <p className="col-span-3 text-sm text-gray-400 italic">
                    No media shared yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      )}

      {showFullAvatar && selectedChat && (
        <AvatarViewModal
          key="avatar-view-modal"
          imageUrl={selectedChat.data.avatar}
          name={selectedChat.type === "user" ? (selectedChat.data as User).username : (selectedChat.data as Group).name}
          onClose={() => setShowFullAvatar(false)}
        />
      )}
    </AnimatePresence>
  );
}
