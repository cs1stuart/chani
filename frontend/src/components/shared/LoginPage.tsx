"use client";

import React from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";

interface Props {
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  loginError: string;
  setLoginError: (v: string) => void;
  loginLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginPage({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginError,
  setLoginError,
  loginLoading,
  onSubmit,
}: Props) {
  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">WorkChat</h1>
          <p className="text-gray-500 text-center mt-2">
            Connect with your colleagues instantly
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setLoginEmail(e.target.value);
                setLoginError("");
              }}
              placeholder="Enter your email..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setLoginPassword(e.target.value);
                setLoginError("");
              }}
              placeholder="Enter your password..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#00a884] focus:border-transparent outline-none transition-all"
            />
          </div>
          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200"
            >
              {loginError}
            </motion.div>
          )}
          <button
            type="submit"
            disabled={
              loginLoading || !loginEmail.trim() || !loginPassword.trim()
            }
            className="w-full bg-[#00a884] text-white font-semibold py-3 rounded-xl hover:bg-[#008f70] transition-colors shadow-lg shadow-[#00a884]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
