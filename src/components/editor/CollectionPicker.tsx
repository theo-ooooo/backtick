"use client";

import { useEffect, useRef, useState } from "react";
import { createCollection } from "@/lib/actions/collection";

interface Props {
  collections: { id: string; name: string }[];
  defaultId?: string | null;
}

/** 에디터 시리즈(컬렉션) 선택 — 커스텀 드롭다운 + 즉석 생성. 선택값은 hidden input(collectionId)으로 제출. */
export function CollectionPicker({ collections, defaultId }: Props) {
  const [list, setList] = useState(collections);
  const [value, setValue] = useState(defaultId ?? "");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = list.find((c) => c.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

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
      <span className="shrink-0 font-mono text-[12px] font-semibold text-faint">시리즈</span>

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
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] text-ink outline-none focus:border-acc"
          />
          <button type="button" onClick={create} disabled={busy} className="shrink-0 rounded-full bg-acc px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60">
            {busy ? "…" : "추가"}
          </button>
          <button type="button" onClick={() => setCreating(false)} className="shrink-0 text-[12px] font-semibold text-faint hover:text-sub">
            취소
          </button>
        </>
      ) : (
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-[13px] font-medium text-ink transition hover:border-acc"
          >
            <span className={selected ? "" : "text-faint"}>{selected ? selected.name : "없음"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-faint" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-[260px] w-[220px] overflow-y-auto rounded-xl border border-line bg-card p-1 shadow-[0_8px_30px_rgba(26,24,21,.16)]">
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-paper ${!value ? "font-bold text-acc" : "text-sub"}`}
              >
                없음
              </button>
              {list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setValue(c.id);
                    setOpen(false);
                  }}
                  className={`block w-full truncate rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-paper ${value === c.id ? "font-bold text-acc" : "text-sub"}`}
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="mt-1 block w-full rounded-lg border-t border-line px-3 py-2 text-left text-[13px] font-semibold text-acc transition hover:bg-paper"
              >
                + 새 시리즈 만들기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
