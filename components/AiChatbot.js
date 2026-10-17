"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";

export default function AiChatbot() {
  const { lang, t, tProductName, tProductUnit } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize welcome message when opened or language changes
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          sender: "bot",
          text: t("botWelcome"),
          products: []
        }
      ]);
    }
  }, [lang]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg = { id: Date.now(), sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, lang })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: data.text || "Here are some recommendations from our store:",
            products: data.products || []
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: data.error || "Sorry, I encountered an issue fetching recommendations. Please try again!",
            products: []
          }
        ]);
      }
    } catch (err) {
      console.error("Chatbot request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Server connection error. Please ensure the SmartGrocer application server is running.",
          products: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  const handleClear = () => {
    setMessages([
      {
        id: Date.now(),
        sender: "bot",
        text: t("botWelcome"),
        products: []
      }
    ]);
  };

  const handleAddToCart = (product) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartchange"));
  };

  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in your browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    const speechLangMap = { hi: "hi-IN", kn: "kn-IN", ml: "ml-IN", ta: "ta-IN", te: "te-IN", en: "en-US" };
    recognition.lang = speechLangMap[lang] || "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
    }
  };

  const fallbackImg = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        className={`chatbot-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
      >
        <span className="chatbot-icon">🤖</span>
        <span className="chatbot-label">AI Assistant</span>
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="bot-avatar">🤖</span>
              <div>
                <h4>{t("botName")}</h4>
                <p className="bot-status">
                  <span className="status-dot"></span> {t("botOnline")}
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button className="icon-btn" onClick={handleClear} title={t("clearChat")}>
                🗑️
              </button>
              <button className="icon-btn" onClick={() => setIsOpen(false)} title="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                <div className="bubble-content">
                  <p>{msg.text}</p>

                  {/* Embedded Recommended Products */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="chat-products-grid">
                      {msg.products.map((p) => (
                        <div key={p.id} className="chat-prod-card">
                          <div className="chat-prod-details">
                            <h5>{tProductName(p.name)}</h5>
                            <span className="chat-prod-price">₹{p.price} / {tProductUnit(p.unit)}</span>
                            <button className="chat-add-btn" onClick={() => handleAddToCart(p)}>
                              + Add to cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chat-bubble bot loading">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="chatbot-quick-prompts">
            <button onClick={() => handleQuickPrompt(t("botQuick1"))}>{t("botQuick1")}</button>
            <button onClick={() => handleQuickPrompt(t("botQuick2"))}>{t("botQuick2")}</button>
            <button onClick={() => handleQuickPrompt(t("botQuick3"))}>{t("botQuick3")}</button>
            <button onClick={() => handleQuickPrompt(t("botQuick4"))}>{t("botQuick4")}</button>
          </div>

          {/* Input Box */}
          <form
            className="chatbot-input-area"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <button
              type="button"
              className={`voice-btn ${isListening ? "listening" : ""}`}
              onClick={toggleVoiceInput}
              title="Voice Input"
            >
              🎤
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("botPlaceholder")}
            />
            <button type="submit" className="send-btn" disabled={!input.trim() || isLoading}>
              {t("botSend")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
