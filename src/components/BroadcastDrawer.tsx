'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  Send, 
  Image as ImageIcon, 
  Smile, 
  Trash2, 
  Radio, 
  Paperclip, 
  Check, 
  Maximize2, 
  Download, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { parseBroadcastBody } from '@/lib/broadcastUtils';

interface BroadcastItem {
  id: number;
  title: string;
  body: string;
  createdAt: string;
}

interface BroadcastDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isCurrentUserAdmin: boolean;
  recentBroadcasts: BroadcastItem[];
  onBroadcastSent: () => void;
  onDeleteBroadcast: (id: number) => void;
}

const EMOJI_PALETTE = [
  '📢', '📣', '🚀', '🎉', '🔥', '⚡', '☀️', '🏆', 
  '👏', '🙌', '💯', '✨', '📌', '⚠️', '🚨', '💡', 
  '🎯', '🤝', '👍', '✅', '❌', '🔔', '📅', '🕒', 
  '📊', '📈', '📋', '💼', '💪', '🤩', '🥳', '😊', 
  '😎', '🙏', '🌟', '🎊', '🎈', '❤️', '🟢', '🇮🇳'
];

export default function BroadcastDrawer({
  isOpen,
  onClose,
  isCurrentUserAdmin,
  recentBroadcasts,
  onBroadcastSent,
  onDeleteBroadcast,
}: BroadcastDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowEmojiPicker(false);
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Auto-scroll to bottom of chat on open or updates
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [isOpen, recentBroadcasts.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds the 5MB limit.');
      return;
    }

    setErrorMessage(null);
    setPhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(previewUrl);
  };

  const removePhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    if (!textareaRef.current) {
      setMessage((prev) => prev + emoji);
      return;
    }
    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const updated = message.substring(0, start) + emoji + message.substring(end);
    setMessage(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + emoji.length;
      }
    }, 10);
  };

  const handleSendBroadcast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() && !photoFile) return;

    setSending(true);
    setErrorMessage(null);

    try {
      let uploadedImageUrl: string | null = null;

      // 1. Upload photo if selected
      if (photoFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', photoFile);

        const uploadRes = await fetch('/api/v1/notifications/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.message || 'Failed to upload photo.');
        }
        uploadedImageUrl = uploadData.url;
        setUploading(false);
      }

      // 2. Broadcast announcement to all employees
      const broadcastRes = await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          title: title.trim(),
          message: message.trim(),
          imageUrl: uploadedImageUrl,
        }),
      });

      const broadcastData = await broadcastRes.json();
      if (!broadcastRes.ok || !broadcastData.success) {
        throw new Error(broadcastData.message || 'Failed to send broadcast.');
      }

      // Reset state on successful broadcast
      setMessage('');
      setTitle('');
      setShowTitleInput(false);
      removePhoto();
      setShowEmojiPicker(false);
      onBroadcastSent();

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Send broadcast error:', err);
      setErrorMessage(err.message || 'Failed to broadcast announcement. Please try again.');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  // Sort broadcasts oldest-to-newest so it flows like a chat stream
  const chatStream = [...recentBroadcasts].reverse();

  const drawerContent = (
    <div className="fixed inset-0 z-[9999] flex justify-end font-sans">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Side Slide Chat Drawer */}
      <div className="relative w-full sm:w-[480px] md:w-[520px] h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden animate-slide-left z-10">
        
        {/* Header */}
        <div className="p-4 bg-[var(--bg-main)]/90 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F7D32]/15 border border-[#4F7D32]/30 flex items-center justify-center text-[#4F7D32] shadow-sm">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-wide">
                  Santori Broadcast
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#4F7D32]/20 text-[#4F7D32] border border-[#4F7D32]/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                <span>Connected to all active employees</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-xl transition-all cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[var(--bg-card)]">
          {chatStream.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)] space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[#4F7D32]">
                <Radio className="w-8 h-8 opacity-70" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">No Broadcasts Yet</p>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mt-1">
                  Send company announcements, achievements, or urgent alerts directly to everyone's screen.
                </p>
              </div>
            </div>
          ) : (
            chatStream.map((item) => {
              const { text, imageUrl } = parseBroadcastBody(item.body);
              const formattedDate = new Date(item.createdAt).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="bg-[var(--bg-main)]/90 border border-[var(--border-color)] rounded-2xl p-4 shadow-sm hover:border-[#4F7D32]/40 transition-all space-y-2.5 group relative"
                >
                  {/* Bubble Top Meta */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)]/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#4F7D32] text-white flex items-center justify-center text-[10px] font-black uppercase">
                        S
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Santori Admin
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {formattedDate}
                      </span>
                      {isCurrentUserAdmin && (
                        <button
                          type="button"
                          onClick={() => onDeleteBroadcast(item.id)}
                          className="opacity-60 hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer"
                          title="Delete this broadcast announcement for all employees"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bubble Title / Headline (only show if not identical to text) */}
                  {item.title && (() => {
                    const cleanTitle = item.title.replace(/^📢\s*/, '').trim();
                    if (cleanTitle.toLowerCase() === text.trim().toLowerCase()) return null;
                    return (
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#4F7D32] dark:text-[#68A344] leading-snug">
                        {item.title}
                      </h4>
                    );
                  })()}

                  {/* Bubble Text */}
                  {text && (
                    <p className="text-xs sm:text-[13px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed select-text font-normal">
                      {text}
                    </p>
                  )}

                  {/* Bubble Image Attachment with preserved aspect ratio */}
                  {imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-[var(--border-color)] bg-black/10 dark:bg-black/40 group/img mt-2.5 p-1.5 flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt="Broadcast Attachment"
                        className="w-auto h-auto max-w-full max-h-[380px] object-contain rounded-lg cursor-pointer hover:opacity-95 transition-all block mx-auto"
                        onClick={() => setLightboxImage(imageUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxImage(imageUrl)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"
                        title="Click to expand full image"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Compose Box (Admin only) */}
        {isCurrentUserAdmin ? (
          <div className="p-3.5 bg-[var(--bg-main)] border-t border-[var(--border-color)] shrink-0 space-y-2 relative">
            
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between text-xs text-red-400">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Optional Headline Bar */}
            {showTitleInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Headline / Subject (e.g. Office Notice, Team Milestone...)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#4F7D32] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setTitle('');
                    setShowTitleInput(false);
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 text-xs"
                  title="Remove Headline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => setShowTitleInput(true)}
                  className="hover:text-[#4F7D32] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>+ Add Headline / Subject</span>
                </button>
                <span className="text-[10px] text-[var(--text-muted)]">Broadcasting as Santori Admin</span>
              </div>
            )}

            {/* Photo Preview Thumbnail if attached */}
            {photoPreviewUrl && (
              <div className="relative inline-flex items-center gap-2 p-1.5 pr-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl animate-fade-in">
                <img
                  src={photoPreviewUrl}
                  alt="Selected Attachment"
                  className="w-12 h-12 object-cover rounded-lg border border-[var(--border-color)]"
                />
                <div className="min-w-0 pr-2">
                  <p className="text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[180px]">
                    {photoFile?.name}
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)]">
                    {photoFile ? (photoFile.size / 1024).toFixed(1) + ' KB' : ''} • Photo ready
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-16 left-4 z-50 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-3 w-72 animate-fade-in-up"
              >
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-[#4F7D32]" />
                    <span>Quick Emojis</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {EMOJI_PALETTE.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-7 h-7 flex items-center justify-center text-lg hover:bg-[var(--bg-main)] rounded-lg transition-transform hover:scale-125 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Chat Input Area */}
            <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] focus-within:border-[#4F7D32] rounded-xl overflow-hidden shadow-inner transition-all">
              <textarea
                ref={textareaRef}
                rows={3}
                placeholder="Type your broadcast announcement to all employees... (emojis & formatting preserved)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSendBroadcast();
                  }
                }}
                className="w-full bg-transparent p-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder-slate-500 focus:outline-none resize-none custom-scrollbar"
              />

              {/* Chat Toolbar inside bottom of input box */}
              <div className="px-2.5 py-1.5 bg-[var(--bg-main)]/50 border-t border-[var(--border-color)]/60 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {/* Emoji Button */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      showEmojiPicker 
                        ? 'bg-[#4F7D32]/20 text-[#4F7D32]' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>

                  {/* Photo Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      photoFile 
                        ? 'bg-[#4F7D32]/20 text-[#4F7D32]' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}
                    title="Attach Photo"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendBroadcast()}
                  disabled={sending || (!message.trim() && !photoFile)}
                  className="py-1.5 px-4 bg-[#4F7D32] hover:bg-[#436A2B] disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#4F7D32]/20"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{uploading ? 'Uploading Photo...' : 'Broadcasting...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-[var(--bg-main)] border-t border-[var(--border-color)] text-center text-xs text-[var(--text-secondary)]">
            🔒 Read-only announcement stream. Only administrators can post broadcasts.
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-3 py-2 border-b border-[var(--border-color)]">
              <span className="text-xs font-bold text-[var(--text-primary)]">Broadcast Photo</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage}
                  download="broadcast_image"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
                  title="Open full size / Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={lightboxImage}
                alt="Broadcast Full Zoom"
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return mounted ? createPortal(drawerContent, document.body) : drawerContent;
}
