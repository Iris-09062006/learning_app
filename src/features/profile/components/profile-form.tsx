"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProfileFormProps {
  initialUsername: string;
}

interface PatchResponse {
  success: boolean;
  data?: { username: string };
  error?: { message?: string; details?: { username?: string } };
}

export function ProfileForm({ initialUsername }: ProfileFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setMessage({ type: "error", text: "Username phải có từ 3 đến 50 ký tự." });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername }),
      });
      const body = (await response.json()) as PatchResponse;
      if (!response.ok || !body.success) {
        setMessage({
          type: "error",
          text: body.error?.details?.username ?? body.error?.message ?? "Không thể cập nhật hồ sơ.",
        });
        return;
      }
      setUsername(body.data?.username ?? trimmedUsername);
      setMessage({ type: "success", text: "Đã cập nhật username." });
    } catch {
      setMessage({ type: "error", text: "Không thể kết nối. Vui lòng thử lại." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
          Username
        </label>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={50}
          required
          aria-describedby="username-help"
        />
        <p id="username-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Từ 3 đến 50 ký tự. Đây là tên hiển thị, không thay đổi email đăng nhập.
        </p>
      </div>
      {message ? (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={message.type === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}
        >
          {message.text}
        </p>
      ) : null}
      <Button type="submit" isLoading={isSaving} disabled={username.trim() === initialUsername}>
        Lưu thay đổi
      </Button>
    </form>
  );
}
