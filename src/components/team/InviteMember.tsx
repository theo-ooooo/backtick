"use client";

import { useState } from "react";
import { inviteMember } from "@/lib/actions/team";

/** 팀 멤버 초대 — 핸들 입력. owner에게만 노출. */
export function InviteMember({ teamId }: { teamId: string }) {
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!handle.trim() || busy) return;
    setBusy(true);
    const res = await inviteMember(teamId, handle.replace(/^@/, ""));
    setBusy(false);
    if (res.ok) {
      setMsg("초대했어요");
      setHandle("");
    } else {
      setMsg(res.error ?? "실패했어요");
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label className="text-[12px] font-bold text-sub">멤버 초대</label>
      <div className="mt-2 flex gap-1.5">
        <input
          value={handle}
          placeholder="@핸들"
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[13px] outline-none focus:border-acc"
        />
        <button type="button" onClick={submit} disabled={busy} className="shrink-0 rounded-lg bg-acc px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60">
          초대
        </button>
      </div>
      {msg && <p className="mt-1.5 text-[12px] font-medium text-muted">{msg}</p>}
    </div>
  );
}
