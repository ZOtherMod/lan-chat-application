import React, { useState } from 'react';

const NicknameForm = ({ onSubmit }) => {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length >= 2 && trimmedNickname.length <= 20) {
      onSubmit(trimmedNickname);
    }
  };

  const isValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;

  return (
    <div className="form-container">
      <h2>👋 Welcome to LAN Chat!</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Choose a nickname to get started
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nickname">Nickname</label>
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname (2-20 characters)"
            maxLength="20"
            autoFocus
          />
          {nickname.trim().length > 0 && nickname.trim().length < 2 && (
            <small style={{ color: '#dc3545', fontSize: '0.8em' }}>
              Nickname must be at least 2 characters long
            </small>
          )}
        </div>
        
        <button 
          type="submit" 
          className="btn"
          disabled={!isValid}
        >
          Continue →
        </button>
      </form>
    </div>
  );
};

export default NicknameForm;