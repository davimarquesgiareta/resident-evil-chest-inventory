import { supabase } from "@/lib/supabaseClient";
import type { DbItem, DbItemCombination, DbInventoryRow, InventoryWithItem } from "@/lib/types";

export async function fetchInventory(): Promise<InventoryWithItem[]> {
  const { data, error } = await supabase
    .from("inventory")
    .select(
      `
      id,
      item_id,
      quantity,
      location,
      slot_index,
      item:items (
        id,
        name,
        description,
        image_url,
        stackable,
        max_stack,
        is_combinable
      )
    `,
    )
    .order("location", { ascending: true })
    .order("slot_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as InventoryWithItem[];
}

export async function fetchItemById(itemId: string): Promise<DbItem | null> {
  const { data, error } = await supabase
    .from("items")
    .select("id,name,description,image_url,stackable,max_stack,is_combinable")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbItem | null;
}

export async function fetchItemByNameLike(term: string): Promise<DbItem | null> {
  const { data, error } = await supabase
    .from("items")
    .select("id,name,description,image_url,stackable,max_stack,is_combinable")
    .ilike("name", `%${term}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbItem | null;
}

export async function fetchAllItems(): Promise<DbItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("id,name,description,image_url,stackable,max_stack,is_combinable")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbItem[];
}

export async function findCombination(
  itemAId: string,
  itemBId: string,
): Promise<DbItemCombination | null> {
  const { data, error } = await supabase
    .from("item_combinations")
    .select("id,item_a_id,item_b_id,result_item_id")
    .in("item_a_id", [itemAId, itemBId])
    .in("item_b_id", [itemAId, itemBId]);
  if (error) throw error;
  const combinations = (data ?? []) as DbItemCombination[];
  const found =
    combinations.find((c) => c.item_a_id === itemAId && c.item_b_id === itemBId) ??
    combinations.find((c) => c.item_a_id === itemBId && c.item_b_id === itemAId) ??
    null;
  return found;
}

export async function updateInventoryRow(
  id: string,
  patch: Partial<Pick<DbInventoryRow, "quantity" | "location" | "slot_index">>,
): Promise<void> {
  const { error } = await supabase.from("inventory").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteInventoryRow(id: string): Promise<void> {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}

export async function insertInventoryRow(row: Omit<DbInventoryRow, "id">): Promise<DbInventoryRow> {
  const { data, error } = await supabase
    .from("inventory")
    .insert(row)
    .select("id,item_id,quantity,location,slot_index")
    .single();
  if (error) throw error;
  return data as DbInventoryRow;
}

