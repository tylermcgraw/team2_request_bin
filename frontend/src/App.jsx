import { useState, useEffect } from 'react';
import {
  Routes, Route, Link, Navigate, Outlet
} from "react-router-dom";
import NewBasketCard from './components/NewBasketCard';
import BasketsList from './components/BasketsList';
import Basket from './components/Basket';
import './App.css';

const STORAGE_KEY = 'rb:baskets';

function loadBasketNames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];

    return arr.filter(Boolean);
  } catch {
    return [];
  }
}

function saveBasketNames(names) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  } catch {
    return;
  }
}

function App() {
  const [baskets, setBaskets] = useState(() => loadBasketNames());

  useEffect(() => {
    loadBasketNames();
  },[]);

  useEffect(() => {
    saveBasketNames(baskets);
  },[baskets]);

  return (
    <div>
      <header>
        <Link to='/web'>Request Baskets</Link>
      </header>
    
      <Routes>
        <Route path='/' element={<Navigate replace to='/web' />} />
        <Route path='/web' element={<Outlet />}>
          <Route 
            index
            element={
              <main className='layout'>
                <div className='primary'>
                  <NewBasketCard
                    setBaskets={setBaskets}
                  />
                </div>
                <div className='sidebar'>
                  <BasketsList baskets={baskets} />
                </div> 
              </main>
            }
          />
          <Route path=':urlEndpoint' element={<Basket setBaskets={setBaskets} />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
