import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/axiosConfig';
import { Pet, User, EquipmentSlot } from '../types';
import InventoryPage from './InventoryPage';
import ShopPage from './ShopPage';
import petAvatarImage from '../assets/pet-avatar.jpg';

interface PetPageProps {
  user: User;
  refreshUser: () => void;
}

type PetView = 'pet' | 'inventory' | 'shop';

const PetPage: React.FC<PetPageProps> = ({ user, refreshUser }) => {
  const [pet, setPet] = useState<Pet | null>(null);
  const [view, setView] = useState<PetView>('pet');
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [petName, setPetName] = useState('');

  const fetchPet = useCallback(async () => {
    try {
      setLoading(true);
      const petResponse = await apiClient.get<Pet>('/pet');
      setPet(petResponse.data);
      setPetName(petResponse.data.name);
    } catch (error) {
      console.error('Failed to fetch pet data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  const handleItemAction = () => {
    refreshUser();
    fetchPet();
  };

  const navigateTo = (targetView: PetView) => {
    setView(targetView);
  };

  const handleNameSave = async () => {
    if (!pet || petName.trim() === '' || petName === pet.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const response = await apiClient.patch<Pet>('/pet', { name: petName });
      setPet(response.data);
      setIsEditingName(false);
    } catch (error) {
      alert('Failed to update pet name.');
      if (pet) {
        setPetName(pet.name);
      }
    }
  };

  const renderContent = () => {
    if (loading) return <div>Loading...</div>;

    switch (view) {
      case 'inventory':
        return (
          <div className="pet-overlay-view">
            <InventoryPage pet={pet} onPetUpdated={handleItemAction} />
          </div>
        );
      case 'shop':
        return (
          <div className="pet-overlay-view">
            <ShopPage onItemPurchased={handleItemAction} />
          </div>
        );
      case 'pet':
      default:
        if (!pet) return <div>Could not load pet data.</div>;
        return (
          <div className="pet-avatar-container">
            <div className="pet-avatar">
              <img src={petAvatarImage} alt="Your Pet" />
            </div>
          </div>
        );
    }
  };

  const equippedBackground = pet?.equipped?.find(
    (e) => e.slot === EquipmentSlot.BACKGROUND,
  );
  const backgroundStyle = equippedBackground?.item.imageUrl
    ? { backgroundImage: `url(${equippedBackground.item.imageUrl})` }
    : {};

  return (
    <div className="pet-page-container">
      <div className="pet-header">
        {pet ? (
          <>
            {isEditingName ? (
              <div className="pet-name-edit">
                <input
                  type="text"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  onBlur={handleNameSave}
                  autoFocus
                />
                <button onClick={handleNameSave}>Save</button>
              </div>
            ) : (
              <h3
                onClick={() => setIsEditingName(true)}
                style={{ cursor: 'pointer' }}
              >
                {pet.name} ✏️
              </h3>
            )}
            <div className="pet-header-info">
              <div className="player-currency">
                <span>💰 Gold: {user.gold}</span>
                <span>💎 Gems: {user.gems}</span>
              </div>
              <div className="pet-stats-bars">
                <span>Health: {pet.health}/100</span>
                <span>Hunger: {pet.hunger}/100</span>
                <span>Happiness: {pet.happiness}/100</span>
                <span>Energy: {pet.energy}/100</span>
              </div>
            </div>
          </>
        ) : (
          <div>Loading header...</div>
        )}
      </div>

      <div className="pet-content-area" style={backgroundStyle}>
        {renderContent()}
        <div className="pet-nav-footer">
          <div className="nav-left">
            <button onClick={() => navigateTo('inventory')}>Inventory</button>
          </div>
          <div className="nav-center">
            {view !== 'pet' && (
              <button onClick={() => navigateTo('pet')}>Pet</button>
            )}
          </div>
          <div className="nav-right">
            <button onClick={() => navigateTo('shop')}>Shop</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetPage;
