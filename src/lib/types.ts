export type ItemLocation = "PLAYER" | "STASH";

export type DbItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  stackable: boolean;
  max_stack: number;
  is_combinable: boolean;
};

export type DbInventoryRow = {
  id: string;
  item_id: string;
  quantity: number;
  location: ItemLocation;
  slot_index: number;
};

export type DbItemCombination = {
  id: string;
  item_a_id: string;
  item_b_id: string;
  result_item_id: string;
};

export type InventoryWithItem = DbInventoryRow & {
  item: DbItem;
};

