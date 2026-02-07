"use client";

export default function LoginButton() {
  return (
    <a
      href="/auth/login"
      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition"
    >
      Log in
    </a>
  );
}
