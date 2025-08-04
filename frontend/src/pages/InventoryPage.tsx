import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/axiosConfig';
import { UserPetItem, ItemType, EquipmentSlot, Pet } from '../types';

interface InventoryPageProps {
  pet: Pet | null;
  onPetUpdated: () => void;
}

const InventoryPage: React.FC<InventoryPageProps> = ({ pet, onPetUpdated }) => {
  const [inventory, setInventory] = useState<UserPetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ItemType | 'ALL'>('ALL');

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<UserPetItem[]>('/pet/inventory');
        setInventory(response.data);
      } catch (err) {
        setError('Failed to fetch inventory.');
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [onPetUpdated]); 

  const handleUseItem = async (userPetItemId: string) => {
    try {
      await apiClient.post('/pet/use', { userPetItemId });
      alert('Item used successfully!');
      onPetUpdated();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || 'Could not use item.'}`);
    }
  };

  const handleEquipItem = async (userPetItemId: string) => {
    try {
      await apiClient.post('/pet/equip', { userPetItemId });
      alert('Item equipped successfully!');
      onPetUpdated();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not equip item.'}`,
      );
    }
  };

  const handleUnequipItem = async (slot: EquipmentSlot) => {
    try {
      await apiClient.delete(`/pet/unequip/${slot}`);
      alert('Item unequipped successfully!');
      onPetUpdated();
    } catch (error: any) {
      alert(
        `Error: ${error.response?.data?.message || 'Could not unequip item.'}`,
      );
    }
  };

  const filteredInventory = useMemo(() => {
    if (activeFilter === 'ALL') {
      return inventory;
    }
    return inventory.filter((invItem) => invItem.item.type === activeFilter);
  }, [inventory, activeFilter]);

  const filterButtons = (
    <div className="filter-nav">
      <button onClick={() => setActiveFilter('ALL')}>All</button>
      <button onClick={() => setActiveFilter(ItemType.FOOD)}>Food</button>
      <button onClick={() => setActiveFilter(ItemType.TREAT)}>Treats</button>
      <button onClick={() => setActiveFilter(ItemType.TOY)}>Toys</button>
      <button onClick={() => setActiveFilter(ItemType.CUSTOMIZATION)}>
        Customization
      </button>
    </div>
  );

  if (loading) return <div>Loading inventory...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>My Inventory</h3>
      {filterButtons}
      <div className="item-grid">
        {filteredInventory.map(({ id, item, quantity }) => {
          const isEquippable =
            item.type === ItemType.CUSTOMIZATION && item.equipmentSlot;
          const currentlyEquippedItem = pet?.equipped?.find(
            (e) => e.slot === item.equipmentSlot,
          );
          const isEquipped = currentlyEquippedItem?.item.id === item.id;

          return (
            <div key={id} className="item-card">
              <div className="item-image-container">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
              </div>

              {/* --- THIS IS THE FIX --- */}
              <div className="item-info">
                <h4>
                  {item.name} (x{quantity})
                </h4>
                <p>{item.description}</p>
              </div>

              {isEquippable ? (
                isEquipped ? (
                  <button
                    onClick={() => handleUnequipItem(item.equipmentSlot!)}
                  >
                    Unequip
                  </button>
                ) : (
                  <button onClick={() => handleEquipItem(id)}>Equip</button>
                )
              ) : (
                <button onClick={() => handleUseItem(id)}>Use</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryPage;
