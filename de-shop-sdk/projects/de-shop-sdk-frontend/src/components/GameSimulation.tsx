import type { Asset } from '../sdk/DeShopSDK'

type GameSimulationProps = {
  activeSkin: Asset | null
}

const rarityColor: Record<string, string> = {
  common: '#4f4f4f',
  rare: '#166fda',
  epic: '#8a2be2',
  legendary: '#e3b341',
}

export default function GameSimulation({ activeSkin }: GameSimulationProps) {
  const color = activeSkin ? rarityColor[activeSkin.rarity] ?? '#2c2c2c' : '#2c2c2c'
  return (
    <div className="game-panel">
      <div className="game-title">[ GAME ENGINE MOCK ]</div>
      <div className="character" style={{ borderColor: color }}>
        <pre>
          {String.raw`      /\    
     /  \   Weapon
====|====\========
    |     \__
    |        \___
`}
        </pre>
      </div>
      <div className="skin-line">
        Active Skin: {activeSkin ? `${activeSkin.name} (${activeSkin.rarity})` : 'Default'}
      </div>
    </div>
  )
}
