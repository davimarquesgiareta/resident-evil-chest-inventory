"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteInventoryRow,
  fetchInventory,
  fetchItemById,
  findCombination,
  insertInventoryRow,
  updateInventoryRow,
} from "@/lib/inventoryApi";
import type { InventoryWithItem, ItemLocation } from "@/lib/types";

type FocusArea = "STASH" | "PLAYER";

const PLAYER_GRID_COLS = 2;
const PLAYER_GRID_ROWS = 4;
const PLAYER_GRID_SIZE = PLAYER_GRID_COLS * PLAYER_GRID_ROWS;

function clampToGrid(slotIndex: number) {
  return Math.max(0, Math.min(PLAYER_GRID_SIZE - 1, slotIndex));
}

function wrapIndex(idx: number, len: number) {
  if (len <= 0) return 0;
  const m = idx % len;
  return m < 0 ? m + len : m;
}

function formatQty(row: InventoryWithItem) {
  return row.item.stackable ? String(row.quantity) : "";
}

function getNextStashSlot(rows: InventoryWithItem[]) {
  if (rows.length <= 0) return 0;
  return Math.max(...rows.map((r) => r.slot_index)) + 1;
}

export default function Home() {
  const [rows, setRows] = useState<InventoryWithItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [focus, setFocus] = useState<FocusArea>("PLAYER");

  const [stashSelectedIdx, setStashSelectedIdx] = useState(0);
  const [playerSelectedSlot, setPlayerSelectedSlot] = useState(0);

  const [contextOpen, setContextOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [combineSourceId, setCombineSourceId] = useState<string | null>(null);

  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);

  const stashItems = useMemo(
    () => rows.filter((r) => r.location === "STASH").sort((a, b) => a.slot_index - b.slot_index),
    [rows],
  );
  const playerItems = useMemo(
    () => rows.filter((r) => r.location === "PLAYER").sort((a, b) => a.slot_index - b.slot_index),
    [rows],
  );

  const selectedStashRow = stashItems[wrapIndex(stashSelectedIdx, stashItems.length)] ?? null;
  const selectedPlayerRow =
    playerItems.find((r) => r.slot_index === clampToGrid(playerSelectedSlot)) ?? null;
  const visibleStashItems = useMemo(() => {
    if (stashItems.length <= 0) return [];
    const center = wrapIndex(stashSelectedIdx, stashItems.length);
    const offsets = [-1, 0, 1];
    return offsets.map((offset) => {
      const idx = wrapIndex(center + offset, stashItems.length);
      return { row: stashItems[idx], index: idx };
    });
  }, [stashItems, stashSelectedIdx]);

  const equippedRow = useMemo(() => {
    if (!equippedWeaponId) return null;
    return rows.find((r) => r.id === equippedWeaponId) ?? null;
  }, [equippedWeaponId, rows]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchInventory();
      setRows(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar inventário.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!contextOpen) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-context-root]")) return;
      setContextOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [contextOpen]);

  const beginCombine = useCallback(() => {
    if (!selectedPlayerRow) return;
    setCombineSourceId(selectedPlayerRow.id);
    setContextOpen(false);
  }, [selectedPlayerRow]);

  const runUse = useCallback(() => {
    if (!selectedPlayerRow) return;
    setEquippedWeaponId(selectedPlayerRow.id);
    setContextOpen(false);
  }, [selectedPlayerRow]);

  const runCheck = useCallback(() => {
    if (!selectedPlayerRow) return;
    setCheckOpen(true);
    setContextOpen(false);
  }, [selectedPlayerRow]);

  const runCombineWithTarget = useCallback(
    async (target: InventoryWithItem) => {
      if (!combineSourceId) return;
      if (target.id === combineSourceId) return;

      const source = rows.find((r) => r.id === combineSourceId) ?? null;
      if (!source) {
        setCombineSourceId(null);
        return;
      }

      setErrorMsg(null);
      try {
        // stacking (mesmo item)
        if (source.item_id === target.item_id && source.item.stackable) {
          const max = Math.max(1, source.item.max_stack || 1);
          const sum = source.quantity + target.quantity;
          const targetNewQty = Math.min(max, sum);
          const sourceNewQty = sum - targetNewQty;

          await updateInventoryRow(target.id, { quantity: targetNewQty });
          if (sourceNewQty <= 0) {
            await deleteInventoryRow(source.id);
          } else {
            await updateInventoryRow(source.id, { quantity: sourceNewQty });
          }

          setCombineSourceId(null);
          await refresh();
          return;
        }

        // crafting/merge (itens diferentes)
        const recipe = await findCombination(source.item_id, target.item_id);
        if (!recipe) {
          setErrorMsg("Esses itens não combinam.");
          setCombineSourceId(null);
          return;
        }

        const resultItem = await fetchItemById(recipe.result_item_id);
        if (!resultItem) {
          setErrorMsg("Item resultante não encontrado no catálogo.");
          setCombineSourceId(null);
          return;
        }

        const location: ItemLocation = target.location;
        const slot_index = target.slot_index;

        await deleteInventoryRow(source.id);
        await deleteInventoryRow(target.id);
        await insertInventoryRow({
          item_id: resultItem.id,
          quantity: 1,
          location,
          slot_index,
        });

        setCombineSourceId(null);
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao combinar.";
        setErrorMsg(msg);
        setCombineSourceId(null);
      }
    },
    [combineSourceId, refresh, rows],
  );

  const onPlayerCellClick = useCallback(
    async (slot: number) => {
      setFocus("PLAYER");
      setContextOpen(false);
      setCheckOpen(false);

      const slotIndex = clampToGrid(slot);
      setPlayerSelectedSlot(slotIndex);

      const target = playerItems.find((r) => r.slot_index === slotIndex) ?? null;
      if (combineSourceId && target) {
        await runCombineWithTarget(target);
        return;
      }
    },
    [combineSourceId, playerItems, runCombineWithTarget],
  );

  const onPlayerCellContextMenu = useCallback(
    (e: React.MouseEvent, slot: number) => {
      e.preventDefault();
      setFocus("PLAYER");
      setCheckOpen(false);

      const slotIndex = clampToGrid(slot);
      setPlayerSelectedSlot(slotIndex);

      const target = playerItems.find((r) => r.slot_index === slotIndex) ?? null;
      if (!target || combineSourceId) {
        setContextOpen(false);
        return;
      }
      setContextOpen(true);
    },
    [combineSourceId, playerItems],
  );

  const moveItemTo = useCallback(
    async (row: InventoryWithItem, to: ItemLocation) => {
      if (row.location === to) return;

      const destinationRows = rows.filter((r) => r.location === to);
      let remaining = row.quantity;

      setErrorMsg(null);
      try {
        if (row.item.stackable) {
          const stackTargets = destinationRows.filter(
            (r) => r.item_id === row.item_id && r.quantity < row.item.max_stack,
          );
          for (const target of stackTargets) {
            if (remaining <= 0) break;
            const capacity = Math.max(0, row.item.max_stack - target.quantity);
            if (capacity <= 0) continue;
            const add = Math.min(capacity, remaining);
            remaining -= add;
            await updateInventoryRow(target.id, { quantity: target.quantity + add });
          }
        }

        if (remaining <= 0) {
          await deleteInventoryRow(row.id);
          await refresh();
          return;
        }

        if (to === "PLAYER") {
          const usedSlots = new Set(
            destinationRows
              .map((r) => r.slot_index)
              .filter((slot) => slot >= 0 && slot < PLAYER_GRID_SIZE),
          );
          const freeSlot = Array.from({ length: PLAYER_GRID_SIZE }, (_, i) => i).find(
            (slot) => !usedSlots.has(slot),
          );
          if (freeSlot === undefined) {
            setErrorMsg("Inventário cheio.");
            return;
          }

          await updateInventoryRow(row.id, {
            location: "PLAYER",
            slot_index: freeSlot,
            quantity: remaining,
          });
          setPlayerSelectedSlot(freeSlot);
          setFocus("PLAYER");
        } else {
          const nextSlot = getNextStashSlot(destinationRows);
          await updateInventoryRow(row.id, {
            location: "STASH",
            slot_index: nextSlot,
            quantity: remaining,
          });
          setFocus("STASH");
        }

        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro ao mover item.";
        setErrorMsg(msg);
      }
    },
    [refresh, rows],
  );

  const onStashWheel = useCallback((e: React.WheelEvent) => {
    if (stashItems.length <= 0) return;
    if (Math.abs(e.deltaY) < 1) return;
    setFocus("STASH");
    setStashSelectedIdx((v) => v + (e.deltaY > 0 ? 1 : -1));
  }, [stashItems.length]);

  const onStashPrimaryAction = useCallback(async () => {
    if (!selectedStashRow) return;
    await moveItemTo(selectedStashRow, "PLAYER");
  }, [moveItemTo, selectedStashRow]);

  const onPlayerPrimaryAction = useCallback(async () => {
    if (!selectedPlayerRow) return;
    if (combineSourceId) {
      await runCombineWithTarget(selectedPlayerRow);
      return;
    }
    await moveItemTo(selectedPlayerRow, "STASH");
  }, [combineSourceId, moveItemTo, runCombineWithTarget, selectedPlayerRow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextOpen(false);
        setCheckOpen(false);
        setCombineSourceId(null);
        return;
      }

      if (focus === "STASH") {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setStashSelectedIdx((v) => v - 1);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setStashSelectedIdx((v) => v + 1);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          void onStashPrimaryAction();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPlayerSelectedSlot((v) => clampToGrid(v - 1));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPlayerSelectedSlot((v) => clampToGrid(v + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPlayerSelectedSlot((v) => clampToGrid(v - PLAYER_GRID_COLS));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPlayerSelectedSlot((v) => clampToGrid(v + PLAYER_GRID_COLS));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        void onPlayerPrimaryAction();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focus, onPlayerPrimaryAction, onStashPrimaryAction]);

  const statusLine = useMemo(() => {
    if (combineSourceId) return "COMBINE: selecione o 2º item";
    if (loading) return "CARREGANDO...";
    if (errorMsg) return errorMsg.toUpperCase();
    return "FINE";
  }, [combineSourceId, errorMsg, loading]);

  return (
    <div className="min-h-dvh bg-[#0b0e14] text-zinc-100">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-8 py-8">
        <header className="flex items-center justify-between">
          <div className="text-sm tracking-[0.25em] text-zinc-300">RESIDENT EVIL — INVENTORY</div>
          <button
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs hover:bg-zinc-800"
            onClick={() => void refresh()}
          >
            Atualizar
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[560px_auto] lg:justify-center">
          {/* LEFT: Stash + status */}
          <section className="grid gap-4">
            <div
              className={[
                "rounded border border-zinc-700 bg-[#0f1420] p-4",
                focus === "STASH" ? "ring-2 ring-emerald-500/50" : "",
              ].join(" ")}
              onMouseDown={() => setFocus("STASH")}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs tracking-[0.3em] text-zinc-300">STASH</div>
                <div className="text-[11px] text-zinc-400">↑/↓ ou scroll</div>
              </div>

              <div className="grid grid-cols-[1fr_24px] gap-2">
                <div onWheel={onStashWheel} className="h-36 overflow-hidden rounded border border-zinc-700 bg-[#0b0f18]">
                  {stashItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-400">Baú vazio</div>
                  ) : (
                    <div className="py-1">
                      {visibleStashItems.map(({ row, index }) => {
                        const selected = index === wrapIndex(stashSelectedIdx, stashItems.length);
                        return (
                          <button
                            key={row.id}
                            className={[
                              "flex w-full items-center gap-3 border px-3 py-2 text-left text-base",
                              selected
                                ? "border-emerald-400 bg-emerald-500/25 text-emerald-100"
                                : "border-transparent text-zinc-200",
                            ].join(" ")}
                            onClick={() => {
                              setFocus("STASH");
                              setStashSelectedIdx(index);
                            }}
                            onDoubleClick={() => {
                              setFocus("STASH");
                              setStashSelectedIdx(index);
                              void moveItemTo(row, "PLAYER");
                            }}
                          >
                            <span className="min-w-0 flex-1 truncate">{row.item.name}</span>
                            <span className="w-10 text-right text-xs text-zinc-300">
                              {formatQty(row)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="h-1/2 rounded border border-zinc-700 bg-zinc-900 text-xs hover:bg-zinc-800"
                    onClick={() => setStashSelectedIdx((v) => v - 1)}
                  >
                    ▲
                  </button>
                  <button
                    className="h-1/2 rounded border border-zinc-700 bg-zinc-900 text-xs hover:bg-zinc-800"
                    onClick={() => setStashSelectedIdx((v) => v + 1)}
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[190px_1fr] gap-4">
                <div className="aspect-[4/3] overflow-hidden rounded border border-zinc-700 bg-[#0b0f18]">
                  {selectedStashRow?.item.image_url ? (
                    <Image
                      src={selectedStashRow.item.image_url}
                      alt={selectedStashRow.item.name}
                      width={320}
                      height={240}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                      sem imagem
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-sm tracking-[0.25em] text-zinc-300">PREVIEW</div>
                  <div className="mt-1 truncate text-base text-zinc-100">
                    {selectedStashRow?.item.name ?? "—"}
                  </div>
                  <div className="mt-1 max-h-[4.5rem] overflow-hidden text-sm text-zinc-400">
                    {selectedStashRow?.item.description ?? "Selecione um item no Baú."}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_180px] gap-4 rounded border border-zinc-700 bg-[#0f1420] p-4">
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded border border-zinc-700 bg-[#0b0f18]" />
                <div className="min-w-0">
                  <div className="text-sm tracking-[0.25em] text-zinc-300">STATUS</div>
                  <div className="mt-1 text-base text-emerald-200">{statusLine}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Enter/duplo clique movem itens entre Baú e Inventário.
                  </div>
                </div>
              </div>

              <div className="rounded border border-zinc-700 bg-[#0b0f18] p-2">
                <div className="text-[11px] tracking-[0.25em] text-zinc-300">WEAPON</div>
                <div className="mt-2 flex h-[100px] items-center justify-center rounded border border-zinc-700 bg-[#0f1420]">
                  {equippedRow?.item.image_url ? (
                    <Image
                      src={equippedRow.item.image_url}
                      alt={equippedRow.item.name}
                      width={160}
                      height={80}
                      className="max-h-[60px] w-auto object-contain"
                    />
                  ) : (
                    <div className="text-xs text-zinc-500">—</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: Player Inventory */}
          <section
            className={[
              "w-fit rounded border border-zinc-700 bg-[#0f1420] p-4",
              focus === "PLAYER" ? "ring-2 ring-indigo-500/50" : "",
            ].join(" ")}
            onMouseDown={() => setFocus("PLAYER")}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs tracking-[0.3em] text-zinc-300">INVENTORY</div>
              <div className="text-[11px] text-zinc-400">setas + Enter move • clique direito menu</div>
            </div>

            <div className="relative grid w-fit grid-cols-2 gap-2">
              {Array.from({ length: PLAYER_GRID_SIZE }).map((_, slot) => {
                const row = playerItems.find((r) => r.slot_index === slot) ?? null;
                const selected = clampToGrid(playerSelectedSlot) === slot;
                const isCombineSource = combineSourceId && row?.id === combineSourceId;
                return (
                  <button
                    key={slot}
                    className={[
                      "group relative h-[100px] w-[100px] rounded border bg-[#0b0f18] p-1 text-left",
                      selected ? "border-red-500" : "border-zinc-700 hover:border-red-500/70",
                      isCombineSource ? "ring-2 ring-amber-400/50" : "",
                    ].join(" ")}
                    onClick={() => void onPlayerCellClick(slot)}
                    onContextMenu={(e) => onPlayerCellContextMenu(e, slot)}
                    onDoubleClick={() => {
                      if (!row) return;
                      void moveItemTo(row, "STASH");
                    }}
                  >
                    {row?.item.image_url ? (
                      <Image
                        src={row.item.image_url}
                        alt={row.item.name}
                        width={128}
                        height={128}
                        className="h-full w-full object-contain"
                      />
                    ) : row ? (
                      <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">
                        {row.item.name}
                      </div>
                    ) : null}

                    {row ? (
                    <div className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/60 px-2 py-0.5 text-sm text-zinc-200">
                        {formatQty(row)}
                      </div>
                    ) : null}
                  </button>
                );
              })}

              {contextOpen && selectedPlayerRow ? (
                <div
                  data-context-root
                  className="absolute right-0 top-0 z-20 w-40 rounded border border-zinc-700 bg-[#0b0f18] p-1 shadow-xl"
                >
                  <div className="px-2 py-1 text-[11px] tracking-[0.25em] text-zinc-400">
                    {selectedPlayerRow.item.name}
                  </div>
                  <MenuButton label="Use" onClick={runUse} />
                  <MenuButton label="Check" onClick={runCheck} />
                  <MenuButton label="Combine" onClick={beginCombine} />
                </div>
              ) : null}
            </div>

            <div className="mt-3 text-xs text-zinc-400">
              {combineSourceId ? (
                <span>
                  Modo <span className="text-amber-300">COMBINE</span>: clique em outro item.
                </span>
              ) : (
                <span>Dica: Enter/duplo clique move item. Clique direito abre menu.</span>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Check modal */}
      {checkOpen && selectedPlayerRow ? (
        <Modal
          title={selectedPlayerRow.item.name}
          onClose={() => setCheckOpen(false)}
          description={selectedPlayerRow.item.description ?? "Sem descrição."}
          imageUrl={selectedPlayerRow.item.image_url}
        />
      ) : null}
    </div>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="text-xs text-zinc-500">Enter</span>
    </button>
  );
}

function Modal({
  title,
  description,
  imageUrl,
  onClose,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded border border-zinc-700 bg-[#0b0f18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <div className="text-sm tracking-[0.25em] text-zinc-200">{title}</div>
          <button
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs hover:bg-zinc-800"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-3 px-4 py-4">
          <div className="aspect-[4/3] overflow-hidden rounded border border-zinc-700 bg-[#0f1420]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={title}
                width={640}
                height={480}
                className="h-full w-full object-contain p-3"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                sem imagem
              </div>
            )}
          </div>
          <div className="text-sm text-zinc-200">{description}</div>
        </div>
      </div>
    </div>
  );
}
