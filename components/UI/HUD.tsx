/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, MapPin, Star, Play, Smile, Shield, PlusCircle, ArrowUpCircle } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

// Available Shop Items
const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'DOUBLE_JUMP',
        name: 'DOUBLE HOP',
        description: 'Jump again in mid-air! Hop hop!',
        cost: 1000,
        icon: ArrowUpCircle,
        oneTime: true
    },
    {
        id: 'MAX_LIFE',
        name: 'EXTRA HEART',
        description: 'Start with more love!',
        cost: 1500,
        icon: Heart
    },
    {
        id: 'HEAL',
        name: 'YUMMY FISH',
        description: 'Heal 1 Heart instantly.',
        cost: 1000,
        icon: PlusCircle
    },
    {
        id: 'IMMORTAL',
        name: 'GOLDEN COAT',
        description: 'Invincible for 5s! (Press Space)',
        cost: 3000,
        icon: Shield,
        oneTime: true
    }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
    const [items, setItems] = useState<ShopItem[]>([]);

    useEffect(() => {
        let pool = SHOP_ITEMS.filter(item => {
            if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
            if (item.id === 'IMMORTAL' && hasImmortality) return false;
            return true;
        });
        pool = pool.sort(() => 0.5 - Math.random());
        setItems(pool.slice(0, 3));
    }, []);

    return (
        <div className="absolute inset-0 bg-blue-100/90 z-[100] text-slate-700 pointer-events-auto backdrop-blur-sm overflow-y-auto font-cute">
             <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                 <h2 className="text-4xl md:text-5xl font-black text-pink-500 mb-2 tracking-widest text-center drop-shadow-sm">PENGUIN STORE</h2>
                 <div className="bg-white/60 px-6 py-2 rounded-full flex items-center text-yellow-500 mb-8 shadow-sm">
                     <span className="text-lg md:text-xl font-bold mr-2">MY GEMS:</span>
                     <span className="text-2xl font-black">{score.toLocaleString()}</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
                     {items.map(item => {
                         const Icon = item.icon;
                         const canAfford = score >= item.cost;
                         return (
                             <div key={item.id} className="bg-white border-4 border-blue-200 p-6 rounded-3xl flex flex-col items-center text-center hover:scale-105 transition-transform shadow-lg">
                                 <div className="bg-blue-50 p-4 rounded-full mb-4 text-blue-400">
                                     <Icon className="w-8 h-8" />
                                 </div>
                                 <h3 className="text-xl font-bold mb-2 text-slate-600">{item.name}</h3>
                                 <p className="text-slate-400 text-sm mb-4 h-10 flex items-center justify-center">{item.description}</p>
                                 <button 
                                    onClick={() => buyItem(item.id as any, item.cost)}
                                    disabled={!canAfford}
                                    className={`px-6 py-3 rounded-xl font-bold w-full text-base text-white shadow-md transition-colors ${canAfford ? 'bg-pink-400 hover:bg-pink-500' : 'bg-gray-300 cursor-not-allowed'}`}
                                 >
                                     {item.cost} GEMS
                                 </button>
                             </div>
                         );
                     })}
                 </div>

                 <button 
                    onClick={closeShop}
                    className="flex items-center px-10 py-4 bg-gradient-to-r from-blue-400 to-cyan-400 text-white font-bold text-xl rounded-full hover:scale-105 transition-all shadow-lg shadow-blue-200"
                 >
                     KEEP RUNNING! <Play className="ml-2 w-6 h-6 fill-white" />
                 </button>
             </div>
        </div>
    );
};

export const HUD: React.FC = () => {
  const { score, lives, maxLives, collectedLetters, status, level, restartGame, startGame, gemsCollected, distance, isImmortalityActive, speed } = useStore();
  const target = ['G', 'E', 'M', 'I', 'N', 'I'];

  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50 font-cute";

  if (status === GameStatus.SHOP) return <ShopScreen />;

  if (status === GameStatus.MENU) {
      return (
          <div className="absolute inset-0 flex items-center justify-center z-[100] bg-blue-50/80 backdrop-blur-sm p-4 pointer-events-auto font-cute">
              <div className="relative w-full max-w-md bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-200 border-8 border-white">
                <div className="bg-gradient-to-b from-blue-300 to-blue-100 h-64 flex items-center justify-center flex-col p-8">
                    <Smile className="w-24 h-24 text-white drop-shadow-md mb-4 animate-bounce" />
                    <h1 className="text-5xl font-black text-white drop-shadow-md">PENGO RUN</h1>
                </div>
                <div className="p-8 flex flex-col items-center">
                    <p className="text-slate-400 text-center mb-8 text-lg font-medium">Help Pengo collect letters and avoid the snowmen!</p>
                    <button 
                        onClick={() => { audio.init(); startGame(); }}
                        className="w-full py-5 bg-pink-400 text-white font-black text-2xl rounded-2xl hover:bg-pink-500 transition-all shadow-lg shadow-pink-200 transform hover:scale-105 flex justify-center items-center"
                    >
                        LET'S GO! <Play className="ml-2 fill-white" />
                    </button>
                    <p className="text-slate-300 text-xs mt-6 font-bold tracking-wider">
                        USE ARROW KEYS OR SWIPE
                    </p>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-slate-900/50 z-[100] backdrop-blur-md flex items-center justify-center p-4 font-cute pointer-events-auto">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                <h1 className="text-5xl font-black text-slate-700 mb-6">OOPS!</h1>
                
                <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl">
                        <span className="text-blue-400 font-bold flex items-center"><Trophy className="w-5 h-5 mr-2"/> Level</span>
                        <span className="text-2xl font-bold text-slate-600">{level}</span>
                    </div>
                    <div className="flex justify-between items-center bg-pink-50 p-4 rounded-xl">
                        <span className="text-pink-400 font-bold flex items-center"><Star className="w-5 h-5 mr-2"/> Gems</span>
                        <span className="text-2xl font-bold text-slate-600">{gemsCollected}</span>
                    </div>
                    <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-xl">
                        <span className="text-yellow-500 font-bold flex items-center">SCORE</span>
                        <span className="text-3xl font-black text-slate-700">{score.toLocaleString()}</span>
                    </div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="w-full py-4 bg-blue-400 text-white font-bold text-xl rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-200"
                >
                    TRY AGAIN
                </button>
              </div>
          </div>
      );
  }

  if (status === GameStatus.VICTORY) {
    return (
        <div className="absolute inset-0 bg-pink-50/90 z-[100] backdrop-blur-md flex items-center justify-center p-4 font-cute pointer-events-auto">
            <div className="text-center">
                <div className="mb-6 inline-block p-6 bg-white rounded-full shadow-xl">
                    <Trophy className="w-24 h-24 text-yellow-400 animate-bounce" />
                </div>
                <h1 className="text-6xl font-black text-pink-500 mb-4 drop-shadow-sm">YAY! YOU DID IT!</h1>
                <p className="text-2xl text-slate-500 mb-8">Pengo is super happy now!</p>
                <div className="bg-white p-6 rounded-3xl shadow-lg mb-8 inline-block min-w-[300px]">
                    <div className="text-slate-400 text-sm mb-1 uppercase font-bold">Final Score</div>
                    <div className="text-5xl font-black text-blue-500">{score.toLocaleString()}</div>
                </div>
                <br/>
                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-12 py-4 bg-pink-400 text-white font-bold text-2xl rounded-full hover:scale-105 transition-all shadow-xl shadow-pink-200"
                >
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className={containerClass}>
        {/* Top HUD */}
        <div className="flex justify-between items-start w-full">
            <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm border-2 border-white">
                <div className="text-3xl md:text-4xl font-black text-blue-400 tracking-wide">
                    {score.toLocaleString()}
                </div>
            </div>
            
            <div className="flex space-x-1 md:space-x-2 bg-white/50 p-2 rounded-full backdrop-blur-sm">
                {[...Array(maxLives)].map((_, i) => (
                    <Heart 
                        key={i} 
                        className={`w-8 h-8 md:w-10 md:h-10 transition-all ${i < lives ? 'text-red-400 fill-red-400 scale-100' : 'text-slate-300 fill-slate-200 scale-90'}`} 
                    />
                ))}
            </div>
        </div>
        
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-white font-bold tracking-wider bg-black/10 px-4 py-1 rounded-full backdrop-blur-sm z-50">
            LEVEL {level}
        </div>

        {/* Immortality Banner */}
        {isImmortalityActive && (
             <div className="absolute top-28 left-1/2 transform -translate-x-1/2 bg-yellow-300 text-yellow-800 px-6 py-2 rounded-full font-black text-xl animate-pulse flex items-center shadow-lg border-4 border-white">
                 <Shield className="mr-2 w-6 h-6 fill-yellow-800" /> INVINCIBLE!
             </div>
        )}

        {/* Letters Collection */}
        <div className="absolute top-24 md:top-28 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
            {target.map((char, idx) => {
                const isCollected = collectedLetters.includes(idx);
                const color = GEMINI_COLORS[idx];

                return (
                    <div 
                        key={idx}
                        style={{
                            backgroundColor: isCollected ? color : 'rgba(255, 255, 255, 0.5)',
                            color: isCollected ? 'white' : 'rgba(100, 116, 139, 0.5)',
                            transform: isCollected ? 'scale(1.1)' : 'scale(1)'
                        }}
                        className={`w-10 h-12 md:w-12 md:h-14 flex items-center justify-center font-black text-xl md:text-2xl rounded-xl shadow-sm transition-all duration-300 border-2 border-white/50`}
                    >
                        {char}
                    </div>
                );
            })}
        </div>

        {/* Bottom Speed Indicator */}
        <div className="w-full flex justify-end items-end">
             <div className="flex items-center space-x-2 text-slate-500 bg-white/60 px-4 py-2 rounded-full backdrop-blur-sm">
                 <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                 <span className="font-bold text-lg">{Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
             </div>
        </div>
    </div>
  );
};