"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MapPin, Route, Share2, Plane } from "lucide-react";
import { RippleButton } from "@/components/ui/RippleButton";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-coral shadow-lg shadow-coral/30 mb-4">
            <Plane className="text-white" size={30} strokeWidth={2} />
          </div>
          <h1 className="font-brand text-4xl text-coral">旅路</h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            讓 AI 為你規劃每一段旅程
          </p>
        </div>

        {/* Illustration */}
        <div className="bg-butter rounded-3xl p-7 mb-8 text-center border border-border">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-charcoal text-sm font-semibold">
            輸入目的地，AI 即刻生成專屬行程
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-muted">
            <span className="flex items-center gap-1 text-xs">
              <MapPin size={13} className="text-coral" /> 拖曳調整
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Route size={13} className="text-coral" /> 備選推薦
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Share2 size={13} className="text-coral" /> 一鍵分享
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
            登入失敗，請重試。
          </div>
        )}

        {/* Login button */}
        <RippleButton
          onClick={handleGoogleLogin}
          rippleColor="rgba(233,116,81,0.12)"
          className="w-full flex items-center justify-center gap-3 bg-white border border-border rounded-2xl px-6 py-4 text-charcoal font-semibold shadow-sm hover:bg-card-hover transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          使用 Google 帳號繼續
        </RippleButton>

        <p className="text-center text-xs text-muted mt-6">
          繼續即表示您同意我們的服務條款與隱私權政策
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
