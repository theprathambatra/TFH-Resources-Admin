import "./globals.css";
import Script from "next/script";
import { Instrument_Serif, Manrope } from "next/font/google";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display"
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata = {
  title: "Resources — The Français Hub",
  description: "Focused French learning resources for TEF, TCF and DELF preparation."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        {children}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
