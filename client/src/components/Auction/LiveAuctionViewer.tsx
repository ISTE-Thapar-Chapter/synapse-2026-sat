import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Card } from '../UI/Card.js';
import { Badge } from '../UI/Badge.js';
import { LiveAuctionState } from '../../types/index.js';
import { Building2, Gavel, CheckCircle2, Radio } from 'lucide-react';

interface LiveAuctionViewerProps {
  className?: string;
}

export const LiveAuctionViewer: React.FC<LiveAuctionViewerProps> = ({ className = '' }) => {
  const [auctionState, setAuctionState] = useState<LiveAuctionState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLiveAuction = async () => {
    try {
      const res = await api.get<{ liveAuction: LiveAuctionState }>('/auction/live');
      if (res && res.liveAuction) {
        setAuctionState(res.liveAuction);
      }
    } catch (err) {
      console.error('[LiveAuction] Error fetching live status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAuction();
    const interval = setInterval(fetchLiveAuction, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeItem = auctionState?.activeItem;
  const isAssigned = auctionState?.status === 'sold' && !!auctionState?.highestBidderTeamName;
  const isBidding = auctionState?.status === 'bidding';

  return (
    <Card className={`overflow-hidden border border-mist shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-mist">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-signal/10 flex items-center justify-center text-signal">
            <Gavel className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-ink">Live Auction Showcase</h3>
            <p className="text-[11px] text-ink-muted">
              Live partner organization bidding floor &bull; Managed and assigned by event administrators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBidding && (
            <Badge variant="signal">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse text-signal" />
                Live on Floor
              </span>
            </Badge>
          )}
          {isAssigned && (
            <Badge variant="success">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Awarded
              </span>
            </Badge>
          )}
          {!isBidding && !isAssigned && (
            <Badge variant="mist">Auction Standby</Badge>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="p-8 text-center text-xs text-ink-muted">
          Loading live auction floor status...
        </div>
      ) : activeItem && activeItem.name ? (
        <div className="py-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-5 bg-paper/60 rounded-lg border border-mist">
            <div className="space-y-1.5 flex-1">
              <div className="text-[11px] font-bold text-signal uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Partner Organization on Block
              </div>
              <h4 className="text-xl font-serif font-bold text-ink">
                {activeItem.name}
              </h4>
              <p className="text-xs text-ink leading-relaxed max-w-xl">
                {activeItem.description || 'Enterprise collaboration and system track partner.'}
              </p>
            </div>

            {/* Initial Bid Callout */}
            <div className="bg-white p-4 rounded-lg border border-mist shadow-xs min-w-[160px] text-center md:text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Initial Bid
              </div>
              <div className="font-mono text-2xl font-bold text-ink mt-0.5">
                {activeItem.basePrice || auctionState?.currentBid || 0}
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                Tokens / Base Value
              </div>
            </div>
          </div>

          {/* Assignment Status Notice */}
          {isAssigned ? (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <span className="text-emerald-900">
                  Assigned to Team: <strong>{auctionState?.highestBidderTeamName}</strong>
                </span>
              </div>
              <Badge variant="success">Assigned</Badge>
            </div>
          ) : isBidding ? (
            <div className="p-3 bg-signal/5 rounded-lg border border-signal/20 text-xs text-ink flex items-center justify-between">
              <span>
                <strong>Bidding is active in the main hall.</strong> Administrators will record the winning team upon completion.
              </span>
              <span className="text-[11px] font-mono text-signal font-bold uppercase tracking-wider">
                Live in Hall
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-ink-muted space-y-1">
          <p className="font-bold text-ink">No company is currently on the auction floor.</p>
          <p>Administrators will showcase the next organization shortly.</p>
        </div>
      )}
    </Card>
  );
};
