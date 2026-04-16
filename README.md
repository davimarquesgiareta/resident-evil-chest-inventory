# 🧟‍♂️ Survival Horror Inventory System

A web-based inventory management system inspired by the classic *Resident Evil* franchise. This project simulates the iconic resource management mechanics, including the item box (stash), player inventory, complex item combinations, and ammo stacking.

Built to showcase state management, drag-and-drop interactions, and relational database modeling.

## ✨ Features

* **Drag-and-Drop Interactions:** Seamlessly move items between the Stash (Item Box) and the Player Inventory.
* **Item Stacking:** Automatically merge identical stackable items (e.g., ammo clips, shells) up to a predefined limit (`max_stack`). Overflow logic is handled automatically.
* **Crafting & Combinations (Merge):** Combine specific items to create new ones (e.g., mixing Green and Red Herbs) based on a dynamic relational database recipe system.
* **Weapon Reloading:** Combine ammo with compatible weapons to update their internal loaded state.
* **Grid Tracking:** Maintains the exact positional `slot_index` of items within the UI grid.