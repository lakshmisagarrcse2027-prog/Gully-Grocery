import "./globals.css";
import { LanguageProvider } from "../components/LanguageContext";
import AiChatbot from "../components/AiChatbot";

export const metadata = {
  title: "SmartGrocer • Local Grocery Shopping",
  description: "Browse, order groceries online for home delivery or store pickup."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
          <AiChatbot />
        </LanguageProvider>
      </body>
    </html>
  );
}