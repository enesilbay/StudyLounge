import { Medal, Award, Gem, Crown } from 'lucide-react';
import { getRankInfo } from '../../lib/rank';

interface RankBadgeProps {
  score: number;
  showText?: boolean;
  size?: number;
}

export default function RankBadge({ score, showText = true, size = 16 }: RankBadgeProps) {
  const rank = getRankInfo(score);
  
  const IconComponent = () => {
    switch (rank.icon) {
      case 'medal': return <Medal size={size} color={rank.color} />;
      case 'award': return <Award size={size} color={rank.color} />;
      case 'gem': return <Gem size={size} color={rank.color} />;
      case 'crown': return <Crown size={size} color={rank.color} />;
      default: return <Medal size={size} color={rank.color} />;
    }
  };

  return (
    <div className="flex items-center gap-1.5" title={`${rank.title} (${score} Puan)`}>
      <IconComponent />
      {showText && <span style={{ color: rank.color }} className="font-bold text-sm">{rank.title}</span>}
    </div>
  );
}
