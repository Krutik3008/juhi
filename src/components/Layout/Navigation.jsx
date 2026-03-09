import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Type, AlignLeft, Search, Cpu, Settings, Code, Zap } from 'lucide-react';
import './Navigation.css'; // Creating scoped CSS for navbar

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home - Full Pipeline', icon: <Cpu size={20} /> },
    { path: '/unit1', label: 'Unit I: Lexical Analysis', icon: <Type size={20} /> },
    { path: '/unit2-3', label: 'Unit II & III: Syntax', icon: <AlignLeft size={20} /> },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <Zap className="logo-icon" size={28} />
          <div>
            <h1 className="logo-text">Compiler</h1>
            <h2 className="logo-subtext">Toolkit Engine</h2>
          </div>
        </div>
      </div>
      
      <div className="nav-list">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="active-indicator" />}
            </NavLink>
          );
        })}
      </div>
      
      <div className="sidebar-footer">
        <div className="status-badge">
          <span className="status-dot"></span>
          Engine Ready
        </div>
      </div>
    </div>
  );
};

export default Navigation;
