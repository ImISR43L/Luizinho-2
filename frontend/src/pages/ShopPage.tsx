import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/axiosConfig';
import { PetItem, ItemType } from '../types';

interface ShopPageProps {
  onItemPurchased: () => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ onItemPurchased }) => {
  const [shopItems, setShopItems] = useState<PetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ItemType | 'ALL'>('ALL');

  useEffect(() => {
    const fetchShopItems = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<PetItem[]>('/pet/shop');
        setShopItems(response.data);
      } catch (err) {
        setError('Failed to fetch shop items.');
      } finally {
        setLoading(false);
      }
    };
    fetchShopItems();
  }, [onItemPurchased]);

  const handleBuyItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to buy this item?')) {
      try {
        await apiClient.post(`/pet/shop/buy/${itemId}`);
        alert('Purchase successful!');
        onItemPurchased();
      } catch (error: any) {
        alert(
          `Error: ${error.response?.data?.message || 'Could not purchase item.'}`,
        );
      }
    }
  };

  const filteredShopItems = useMemo(() => {
    if (activeFilter === 'ALL') {
      return shopItems;
    }
    return shopItems.filter((item) => item.type === activeFilter);
  }, [shopItems, activeFilter]);

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

  if (loading) return <div>Loading shop...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h3>Item Shop</h3>
      {filterButtons}
      <div className="item-grid">
        {filteredShopItems.map((item) => (
          <div key={item.id} className="item-card">
            <div className="item-image-container">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} />}
            </div>
            <div className="item-info">
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <p>Cost: {item.cost} Gold</p>
            </div>
            <button onClick={() => handleBuyItem(item.id)}>Buy</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopPage;
