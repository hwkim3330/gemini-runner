/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export const Effects: React.FC = () => {
  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom 
        luminanceThreshold={0.6} 
        mipmapBlur 
        intensity={0.6} // Softer glow
        radius={0.8} // Wider spread
        levels={6}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.3} />
    </EffectComposer>
  );
};