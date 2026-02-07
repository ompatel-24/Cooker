// layout.js
import { Inter } from 'next/font/google';
import "./globals.css";

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

export const metadata = {
    title: "Meal Snap",
    description: "Snap your fridge, discover recipes",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={inter.variable}>
        <body className={`${inter.className} min-h-screen`}>
        {children}
        </body>
        </html>
    );
}