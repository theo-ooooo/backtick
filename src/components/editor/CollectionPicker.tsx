"use client";

import { useState } from "react";
import { createCollection } from "@/lib/actions/collection";

interface Props {
  collections: { id: string; name: string }[];
  defaultId?: string | null;
}

/** 에디터 시리즈(컬렉션) 선택 — 기존 목록 + 즉석 생성. 선택값은 hidden input(collectionId)으로 제출. */
export function CollectionPicker({ collections, defaultId }: Props) {
  const [list, setList] = useState(collections);
  const [value, setValue] = useState(defaultId ?? "");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const res = await createCollection(name.trim());
    setBusy(false);
    if ("id" in res) {
      setList((l) => [{ id: res.id, name: res.name }, ...l]);
      setValue(res.id);
      setCreating(false);
      setName("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name="collectionId" value={value} />
      <span className="font-mono text-[12px] font-semibold text-faint">시리즈</span>
      {creating ? (
        <>
          <input
            value={name}
            autoFocus
            placeholder="새 시리즈 이름"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
            }}
            className="rounded-lg border border-line bg-card px-2.5 py-1 text-[13px] outline-none focus:border-acc"
          />
          <button type="button" onClick={create} disabled={busy} className="rounded-full bg-acc px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-60">
            {busy ? "…" : "추가"}
          </button>
          <button type="button" onClick={() => setCreating(false)} className="text-[12px] font-semibold text-faint hover:text-sub">
            취소
          </button>
        </>
      ) : (
        <>
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === "__new") setCreating(true);
              else setValue(e.target.value);
            }}
            className="rounded-lg border border-line bg-card px-2.5 py-1 text-[13px] font-medium outline-none focus:border-acc"
          >
            <option value="">없음</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new">+ 새 시리즈…</option>
          </select>
        </>
      )}
    </div>
  );
}
