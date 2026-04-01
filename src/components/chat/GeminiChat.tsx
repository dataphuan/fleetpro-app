
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, Trash2, Sparkles, Mic, Volume2, VolumeX, Settings } from "lucide-react";
import { geminiService } from "@/services/GeminiService";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { AISettingsForm } from "@/components/settings/AISettingsForm";

interface Message {
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: number;
}

const SUGGESTED_QUESTIONS = [
    "Có bao nhiêu xe đang hoạt động?",
    "Tài xế nào có nhiều chuyến nhất tháng này?",
    "Doanh thu 7 ngày qua là bao nhiêu?",
    "Xe nào sắp đến hạn bảo trì?"
];

export function GeminiChat() {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.lang = 'vi-VN';
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInputValue(transcript);
                    setIsListening(false);
                    // Auto-send after recognition
                    setTimeout(() => handleSend(transcript), 100);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                    toast({
                        title: 'Lỗi nhận dạng giọng nói',
                        description: 'Không thể nhận dạng. Vui lòng thử lại.',
                        variant: 'destructive'
                    });
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, []);

    // Load history from local storage on mount
    useEffect(() => {
        const saved = localStorage.getItem("gemini_chat_history");
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        }
    }, []);

    // Save history
    useEffect(() => {
        localStorage.setItem("gemini_chat_history", JSON.stringify(messages));
        scrollToBottom();
    }, [messages, isOpen]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    };

    const handleSend = async (text: string = inputValue) => {
        const finalInput = text.trim();
        if (!finalInput || isLoading) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            text: finalInput,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Prepare history for API
            const historyForApi = messages.map(m => ({
                role: m.role,
                parts: m.text
            }));

            const responseText = await geminiService.chat(userMsg.text, historyForApi);

            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: "model",
                text: responseText,
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (error: any) {
            console.error("Chat Error", error);
            toast({
                title: "Lỗi kết nối AI",
                description: error.message || "Không thể phản hồi. Vui lòng kiểm tra API Key trong Cài đặt.",
                variant: "destructive",
            });

            const errorMsg: Message = {
                id: crypto.randomUUID(),
                role: "model",
                text: "⚠️ Xin lỗi, tôi gặp sự cố khi kết nối. Hãy kiểm tra lại API Key hoặc thử lại sau.",
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMsg]);

        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                toast({ description: "🎤 Đang lắng nghe..." });
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const speak = (text: string, messageId?: string) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.onstart = () => {
                setIsSpeaking(true);
                setSpeakingMessageId(messageId || null);
            };
            utterance.onend = () => {
                setIsSpeaking(false);
                setSpeakingMessageId(null);
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
                setSpeakingMessageId(null);
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setSpeakingMessageId(null);
        }
    };

    const clearHistory = () => {
        if (window.confirm("Xóa toàn bộ lịch sử trò chuyện?")) {
            setMessages([]);
            localStorage.removeItem("gemini_chat_history");
            toast({ description: "Đã xóa lịch sử trò chuyện" });
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 animate-in fade-in zoom-in duration-300 hover:scale-110 transition-transform bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-2 border-white/20"
            >
                <Sparkles className="w-7 h-7 animate-pulse" />
            </Button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[450px] max-w-[95vw] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <Card className="h-[650px] flex flex-col shadow-2xl border-primary/20 overflow-hidden">
                {/* Header */}
                <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-white">Trợ lý Vận Tải</CardTitle>
                            <p className="text-xs text-blue-100 opacity-90">Chuyên gia Logistics 24/7</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" title="Cài đặt AI">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] h-[80vh] overflow-y-auto">
                                <DialogTitle className="sr-only">Cài đặt Trợ lý AI</DialogTitle>
                                <AISettingsForm />
                            </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={clearHistory} title="Xóa lịch sử">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                {/* Chat Content */}
                <CardContent className="flex-1 min-h-0 p-0 overflow-hidden relative bg-slate-50">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-70">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <Bot className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Xin chào! Tôi có thể giúp gì?</h3>
                            <p className="text-sm text-balance max-w-[250px] mb-8">
                                Tôi là chuyên gia AI về vận tải. Hãy hỏi tôi về tối ưu chi phí, quản lý đội xe hoặc lộ trình.
                            </p>

                            <div className="grid grid-cols-1 gap-2 w-full max-w-[300px]">
                                {SUGGESTED_QUESTIONS.map((q, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        className="justify-start h-auto py-2 px-3 text-left text-xs text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                        onClick={() => handleSend(q)}
                                    >
                                        <Sparkles className="w-3 h-3 mr-2 text-blue-500 shrink-0" />
                                        {q}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <ScrollArea className="h-full min-h-0 p-4 pr-5">
                            <div className="flex flex-col gap-6 pb-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex w-full max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm break-words",
                                            msg.role === "user"
                                                ? "ml-auto bg-blue-600 text-white rounded-br-none"
                                                : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                                        )}
                                    >
                                        <div className={cn("prose prose-sm max-w-none break-words whitespace-pre-wrap leading-relaxed", msg.role === "user" ? "prose-invert" : "prose-slate")}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                        {msg.role === "model" && (
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50",
                                                        speakingMessageId === msg.id && "text-blue-600"
                                                    )}
                                                    onClick={() => {
                                                        if (speakingMessageId === msg.id) {
                                                            stopSpeaking();
                                                        } else {
                                                            speak(msg.text, msg.id);
                                                        }
                                                    }}
                                                    title={speakingMessageId === msg.id ? "Dừng đọc" : "Đọc nội dung"}
                                                >
                                                    {speakingMessageId === msg.id ? (
                                                        <VolumeX className="w-4 h-4" />
                                                    ) : (
                                                        <Volume2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                        <span className={cn("text-[10px] opacity-70 block text-right mt-1", msg.role === "user" ? "text-blue-100" : "text-slate-400")}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                <div ref={scrollRef} />

                                {isLoading && (
                                    <div className="flex justify-start animate-pulse">
                                        <div className="bg-white border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                            <span className="text-xs text-slate-500 font-medium">Chuyên gia đang phân tích dữ liệu...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>

                {/* Input Footer */}
                <CardFooter className="p-3 border-t bg-white">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex w-full items-end gap-2"
                    >
                        {/* Mic Button */}
                        <Button
                            type="button"
                            size="icon"
                            variant={isListening ? "destructive" : "outline"}
                            className={cn(
                                "h-11 w-11 shrink-0",
                                isListening && "animate-pulse"
                            )}
                            onClick={isListening ? stopListening : startListening}
                            disabled={isLoading}
                            title={isListening ? "Dừng ghi âm" : "Nói vào mic"}
                        >
                            <Mic className="w-5 h-5" />
                        </Button>

                        <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập câu hỏi của bạn..."
                            className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 min-h-[44px]"
                            disabled={isLoading || isListening}
                        />

                        {/* Speaker Toggle */}
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className={cn(
                                "h-11 w-11 shrink-0",
                                isSpeaking && "bg-blue-50 border-blue-300"
                            )}
                            onClick={isSpeaking ? stopSpeaking : undefined}
                            title={isSpeaking ? "Tắt giọng nói" : "Bật giọng nói"}
                        >
                            {isSpeaking ? (
                                <VolumeX className="w-5 h-5 text-blue-600 animate-pulse" />
                            ) : (
                                <Volume2 className="w-5 h-5" />
                            )}
                        </Button>

                        <Button
                            type="submit"
                            size="icon"
                            className="h-11 w-11 bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0"
                            disabled={isLoading || !inputValue.trim() || isListening}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}
