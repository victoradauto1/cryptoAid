"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatEther, parseEther } from "ethers";
import { getReadOnlyContract } from "@/utils/web3provider";
import { fetchMetadataByCampaignId } from "@/services/pinataService";
import { useCryptoAid } from "@/context/cryptoAidProvider";
import DonateModal from "../../../components/Donatemodal";
import StatusBadge from "../../../components/StatusBadge";

/**
 * Campaign Details Page
 *
 * ALIGNED WITH CONTRACT:
 * - Uses campaign.balance (current balance)
 * - Uses campaign.author (creator address)
 * - Uses campaign.status enum (0=ACTIVE, 1=COMPLETED, 2=CANCELLED)
 * - For completed campaigns, shows goal as raised (balance is 0 after withdrawal)
 */

interface CampaignData {
  id: number;
  creator: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  goal: string;
  raised: string;
  deadline: number;
  donorCount: number;
  isActive: boolean;
  status: "ACTIVE" | "ENDED" | "SUCCESSFUL";
  progress: number;
}

export default function CampaignDetails() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;

  const { account, actions, connectWallet, isReady } = useCryptoAid();
  const isExecutingRef = useRef(false);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [donationAmount, setDonationAmount] = useState("");
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [donationError, setDonationError] = useState("");

  useEffect(() => {
    if (!campaignId) return;

    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError(null);

        const contract = await getReadOnlyContract();
        const c = await contract.getCampaign(Number(campaignId));

        // Fetch off-chain metadata
        let metadata = {
          title: c.title || "Untitled Campaign",
          description: c.description || "No description",
          imageUrl: "",
          videoUrl: "",
        };

        try {
          const offChainData = await fetchMetadataByCampaignId(campaignId);
          if (offChainData) {
            metadata = {
              title: offChainData.title || metadata.title,
              description: offChainData.description || metadata.description,
              imageUrl: offChainData.imageUrl || "",
              videoUrl: offChainData.videoUrl || "",
            };
          }
        } catch (metaErr) {
          console.warn("Metadata not found, using on-chain data");
        }

        // Contract field mapping
        const goal = formatEther(c.goal || BigInt(0));
        const balanceValue = c.balance || BigInt(0);
        const deadline = Number(c.deadline || 0);
        const contractStatus = Number(c.status); // 0=ACTIVE, 1=COMPLETED, 2=CANCELLED

        const now = Math.floor(Date.now() / 1000);
        const isExpired = deadline > 0 && now >= deadline;

        // Determine raised amount and status based on contract state
        let raised: string;
        let status: "ACTIVE" | "ENDED" | "SUCCESSFUL";
        let progress: number;

        if (contractStatus === 1) {
          // COMPLETED - goal was reached, funds withdrawn
          raised = goal; // Show full goal as raised
          status = "SUCCESSFUL";
          progress = 100;
        } else if (contractStatus === 2) {
          // CANCELLED
          raised = formatEther(balanceValue);
          status = "ENDED";
          progress = Number(goal) > 0 ? (Number(raised) / Number(goal)) * 100 : 0;
        } else {
          // ACTIVE
          raised = formatEther(balanceValue);
          status = isExpired ? "ENDED" : "ACTIVE";
          progress =
            Number(goal) > 0
              ? Math.min((Number(raised) / Number(goal)) * 100, 100)
              : 0;
        }

        const donorCount = Number(await contract.getDonorCount(Number(campaignId)));

        setCampaign({
          id: Number(campaignId),
          creator: c.author, // Contract uses "author" not "creator"
          title: metadata.title,
          description: metadata.description,
          imageUrl: metadata.imageUrl,
          videoUrl: metadata.videoUrl,
          goal,
          raised,
          deadline,
          donorCount,
          isActive: contractStatus === 0 && !isExpired,
          status,
          progress,
        });
      } catch (err: any) {
        console.error("Error fetching campaign:", err);
        setError(err.message || "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId]);

  const handleDonateClick = () => {
    if (!isReady) {
      connectWallet();
      return;
    }
    setShowDonateModal(true);
    setDonationError("");
  };

  const executeDonation = async () => {
    if (isExecutingRef.current || !actions || !campaign) return;

    const amount = parseFloat(donationAmount);
    if (!amount || amount <= 0) {
      setDonationError("Please enter a valid amount");
      return;
    }

    isExecutingRef.current = true;
    setIsDonating(true);
    setDonationError("");

    try {
      const amountWei = parseEther(donationAmount);
      await actions.donate(BigInt(campaign.id), amountWei);
      window.location.reload();
    } catch (err: any) {
      console.error("Donation failed:", err);
      setDonationError(err.message || "Donation failed");
    } finally {
      setIsDonating(false);
      isExecutingRef.current = false;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf8f6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3f8f7b] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b6b]">Loading campaign...</p>
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="min-h-screen bg-[#faf8f6] text-[#3b3b3b]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 font-medium mb-2">Error</p>
            <p className="text-red-500 text-sm mb-4">{error || "Campaign not found"}</p>
            <Link href="/campaigns" className="text-[#3f8f7b] hover:underline font-medium">
              ← Back to Campaigns
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f6] text-[#3b3b3b]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <Link href="/campaigns" className="inline-flex items-center text-[#6b6b6b] hover:text-[#3b3b3b] mb-6 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaigns
        </Link>

        <div className="mb-6">
          <StatusBadge status={campaign.status} size="lg" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="relative w-full h-96 bg-gray-200 rounded-lg overflow-hidden">
              {campaign.imageUrl ? (
                <Image
                  src={`/api/image-proxy?url=${encodeURIComponent(campaign.imageUrl)}`}
                  alt={campaign.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-[#9b9b9b]">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <h1 className="text-4xl font-bold mb-4">{campaign.title}</h1>
              <p className="text-lg text-[#6b6b6b] leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </p>
            </div>

            {campaign.videoUrl && (
              <div className="bg-white border border-[#e0e0e0] rounded-lg p-4">
                <h3 className="font-semibold mb-3">Campaign Video</h3>
                <a href={campaign.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[#3f8f7b] hover:underline">
                  Watch Video →
                </a>
              </div>
            )}

            {/* Success Message for Completed Campaigns */}
            {campaign.status === "SUCCESSFUL" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1">Campaign Successfully Funded!</h3>
                    <p className="text-sm text-green-700">
                      This campaign reached its funding goal of {campaign.goal} ETH. 
                      Funds have been transferred to the campaign creator.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 sticky top-6">
              <div className="mb-6">
                <p className="text-3xl font-bold text-[#3b3b3b] mb-1">{campaign.raised} ETH</p>
                <p className="text-sm text-[#6b6b6b]">raised of {campaign.goal} ETH goal</p>
              </div>

              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-[#3f8f7b] h-full transition-all" style={{ width: `${campaign.progress}%` }} />
                </div>
                <p className="text-xs text-[#9b9b9b] mt-2">{campaign.progress.toFixed(1)}% funded</p>
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b border-[#e0e0e0]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Donors</span>
                  <span className="font-semibold">{campaign.donorCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b6b6b]">Deadline</span>
                  <span className="font-semibold">{new Date(campaign.deadline * 1000).toLocaleDateString()}</span>
                </div>
              </div>

              {campaign.isActive ? (
                <button onClick={handleDonateClick} className="w-full bg-[#3f8f7b] hover:bg-[#2d7561] text-white font-semibold py-3 rounded-lg transition-colors">
                  {isReady ? "Donate Now" : "Connect to Donate"}
                </button>
              ) : (
                <div className="text-center text-[#6b6b6b] text-sm">
                  {campaign.status === "SUCCESSFUL"
                    ? "🎉 Campaign successfully funded!"
                    : "Campaign has ended"}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#e0e0e0]">
                <p className="text-xs text-[#9b9b9b] mb-1">Created by</p>
                <p className="text-xs font-mono text-[#6b6b6b] break-all">{campaign.creator}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DonateModal
        isOpen={showDonateModal}
        amount={donationAmount}
        onAmountChange={setDonationAmount}
        onCancel={() => {
          setShowDonateModal(false);
          setDonationAmount("");
          setDonationError("");
        }}
        onConfirm={executeDonation}
        disabled={isDonating}
        error={donationError}
      />
    </main>
  );
}