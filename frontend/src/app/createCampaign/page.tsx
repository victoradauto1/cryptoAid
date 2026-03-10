"use client";

/**
 * CreateCampaign
 *
 * Form validation rules:
 * - Title: 5-100 characters
 * - Description: 20-2000 characters
 * - Image URL: max 500 characters
 * - Video URL: max 500 characters
 * - Goal: > 0 ETH
 * - Deadline: future date required
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { parseEther } from "ethers";
import { useCryptoAid } from "../../context/cryptoAidProvider";
import { uploadMetadataToPinata } from "../../services/pinataService";
import ConfirmModal, { WalletIcon } from "../../components/Confirmmodal";
import ProcessingOverlay from "../../components/Processingoverlay";
import { FormInput, FormTextarea } from "../../components/Formcomponents";

/* ============================================================
   VALIDATION CONSTANTS
============================================================ */

const VALIDATION_RULES = {
  title: {
    min: 5,
    max: 100,
    label: "Title",
  },
  description: {
    min: 20,
    max: 2000,
    label: "Description",
  },
  imageUrl: {
    max: 500,
    label: "Image URL",
  },
  videoUrl: {
    max: 500,
    label: "Video URL",
  },
} as const;

export default function CreateCampaign() {
  const router = useRouter();
  const { actions, isReady, connectWallet, account } = useCryptoAid();
  const isExecutingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletMissing, setWalletMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* ============================================================
     VALIDATION HELPERS
  ============================================================ */

  const validateField = (
    value: string,
    rules: { min?: number; max: number; label: string }
  ): string | null => {
    const length = value.trim().length;

    if (rules.min && length > 0 && length < rules.min) {
      return `${rules.label} must be at least ${rules.min} characters.`;
    }

    if (length > rules.max) {
      return `${rules.label} cannot exceed ${rules.max} characters.`;
    }

    return null;
  };

  const validateGoal = () => {
    if (!goal || goal.trim() === "") {
      throw new Error("Goal amount is required.");
    }

    const goalValue = parseFloat(goal);

    if (isNaN(goalValue) || goalValue <= 0) {
      throw new Error("Goal must be greater than 0 ETH.");
    }

    try {
      return parseEther(goal);
    } catch {
      throw new Error("Invalid goal format. Use numbers only (e.g., 1.5).");
    }
  };

  const validateDeadline = () => {
    if (!deadline) {
      throw new Error("Deadline is required.");
    }

    const timestamp = Math.floor(new Date(deadline).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    if (isNaN(timestamp) || timestamp <= now) {
      throw new Error("Deadline must be a valid future date.");
    }

    return BigInt(timestamp);
  };

  /* ============================================================
     CHARACTER COUNTER COMPONENT
  ============================================================ */

  const CharCounter = ({
    current,
    max,
    min,
  }: {
    current: number;
    max: number;
    min?: number;
  }) => {
    const isOverLimit = current > max;
    const isUnderMin = min && current > 0 && current < min;

    return (
      <div
        className={`text-xs mt-1 ${
          isOverLimit
            ? "text-red-600"
            : isUnderMin
            ? "text-amber-600"
            : "text-[#9b9b9b]"
        }`}
      >
        {current}/{max}
        {min && current > 0 && current < min && ` (min: ${min})`}
      </div>
    );
  };

  /* ============================================================
     FORM HANDLERS
  ============================================================ */

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setImageUrl("");
    setGoal("");
    setDeadline("");
    setErrorMessage("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate title
    const titleError = validateField(title, VALIDATION_RULES.title);
    if (titleError) {
      setErrorMessage(titleError);
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    // Validate description
    const descError = validateField(description, VALIDATION_RULES.description);
    if (descError) {
      setErrorMessage(descError);
      return;
    }

    // Validate URLs (only max length, they're optional)
    if (imageUrl) {
      const imgError = validateField(imageUrl, VALIDATION_RULES.imageUrl);
      if (imgError) {
        setErrorMessage(imgError);
        return;
      }
    }

    if (videoUrl) {
      const vidError = validateField(videoUrl, VALIDATION_RULES.videoUrl);
      if (vidError) {
        setErrorMessage(vidError);
        return;
      }
    }

    // Validate goal
    try {
      validateGoal();
    } catch (err: any) {
      setErrorMessage(err.message);
      return;
    }

    // Validate deadline
    try {
      validateDeadline();
    } catch (err: any) {
      setErrorMessage(err.message);
      return;
    }

    if (!isReady || !actions) {
      setWalletMissing(true);
      setShowConfirmModal(true);
      return;
    }

    setWalletMissing(false);
    setShowConfirmModal(true);
  };

  /* ============================================================
     BLOCKCHAIN EXECUTION
  ============================================================ */

  const executeCreateCampaign = async () => {
    if (isExecutingRef.current) return;

    if (walletMissing) {
      setShowConfirmModal(false);
      setIsProcessing(true);

      try {
        await connectWallet();
        setWalletMissing(false);
        setShowConfirmModal(true);
      } catch {
        setErrorMessage("Failed to connect wallet. Please try again.");
      } finally {
        setIsProcessing(false);
      }

      return;
    }

    let goalWei: bigint;
    let deadlineTimestamp: bigint;

    try {
      goalWei = validateGoal();
      deadlineTimestamp = validateDeadline();
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowConfirmModal(false);
      return;
    }

    isExecutingRef.current = true;
    setIsProcessing(true);
    setShowConfirmModal(false);

    try {
      const receipt = await actions!.createCampaign(
        title.trim(),
        description.trim(),
        videoUrl.trim(),
        imageUrl.trim(),
        goalWei,
        deadlineTimestamp
      );

      console.log("Campaign created successfully:", receipt);

      let campaignId: bigint | undefined;

      try {
        for (const log of receipt.logs || []) {
          const parsedLog = log as any;
          if (
            parsedLog.fragment?.name === "CampaignCreated" &&
            parsedLog.args?.campaignId !== undefined
          ) {
            campaignId = parsedLog.args.campaignId;
            break;
          }
        }
      } catch (eventErr) {
        console.warn("Could not extract campaignId from event logs:", eventErr);
      }

      if (campaignId !== undefined && campaignId !== null) {
        try {
          const ipfsUri = await uploadMetadataToPinata({
            campaignId: campaignId.toString(),
            title: title.trim(),
            description: description.trim(),
            imageUrl: imageUrl.trim(),
            videoUrl: videoUrl.trim(),
            goal: goal,
            deadline: Number(deadlineTimestamp),
          });

          console.log("Metadata uploaded to IPFS:", ipfsUri);
        } catch (metadataErr) {
          console.error("Failed to save metadata:", metadataErr);
        }
      }

      resetForm();
      router.push("/campaigns");
    } catch (err: any) {
      console.error("Campaign creation failed:", err);
      setErrorMessage(
        err.message || "Failed to create campaign. Please try again."
      );
      setShowConfirmModal(false);
    } finally {
      setIsProcessing(false);
      isExecutingRef.current = false;
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <main className="min-h-screen bg-[#faf8f6] text-[#3b3b3b]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">
            Create <span className="text-[#3f8f7b]">Campaign</span>
          </h1>
          <Link
            href="/campaigns"
            className="text-[#6b6b6b] hover:text-[#3b3b3b] font-medium transition-colors"
          >
            ← Back
          </Link>
        </div>

        <p className="text-lg leading-relaxed mb-8 text-[#6b6b6b]">
          Create a blockchain-powered fundraising campaign. Set your goal and
          deadline—your campaign succeeds when either the funding goal or time
          limit is reached.
        </p>

        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 shadow-sm">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
            </div>
          )}

          {account && (
            <div className="mb-6 p-3 bg-[#f0f7f5] border border-[#3f8f7b]/20 rounded-lg">
              <p className="text-xs text-[#6b6b6b]">
                <strong>Connected:</strong> {account.slice(0, 6)}...
                {account.slice(-4)}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title with counter */}
            <div>
              <FormInput
                label="Campaign Title"
                value={title}
                onChange={(val) =>
                  val.length <= VALIDATION_RULES.title.max && setTitle(val)
                }
                placeholder="e.g., Help Build a Community Center"
                required
                helpText="A clear, concise title (5-100 characters)"
              />
              <CharCounter
                current={title.length}
                max={VALIDATION_RULES.title.max}
                min={VALIDATION_RULES.title.min}
              />
            </div>

            {/* Description with counter */}
            <div>
              <FormTextarea
                label="Description"
                value={description}
                onChange={(val) =>
                  val.length <= VALIDATION_RULES.description.max &&
                  setDescription(val)
                }
                placeholder="Tell your story and explain what you're raising funds for..."
                rows={5}
                helpText="Detailed explanation of your cause (20-2000 characters)"
              />
              <CharCounter
                current={description.length}
                max={VALIDATION_RULES.description.max}
                min={VALIDATION_RULES.description.min}
              />
            </div>

            {/* Image URL with counter */}
            <div>
              <FormInput
                label="Image URL"
                value={imageUrl}
                onChange={(val) =>
                  val.length <= VALIDATION_RULES.imageUrl.max && setImageUrl(val)
                }
                placeholder="https://example.com/campaign-image.jpg"
                helpText="A cover image for your campaign (optional)"
              />
              {imageUrl && (
                <CharCounter
                  current={imageUrl.length}
                  max={VALIDATION_RULES.imageUrl.max}
                />
              )}
            </div>

            {/* Video URL with counter */}
            <div>
              <FormInput
                label="Video URL"
                value={videoUrl}
                onChange={(val) =>
                  val.length <= VALIDATION_RULES.videoUrl.max && setVideoUrl(val)
                }
                placeholder="https://youtube.com/watch?v=..."
                helpText="A video explaining your campaign (optional)"
              />
              {videoUrl && (
                <CharCounter
                  current={videoUrl.length}
                  max={VALIDATION_RULES.videoUrl.max}
                />
              )}
            </div>

            {/* Goal */}
            <FormInput
              label="Funding Goal (ETH)"
              type="number"
              step="0.01"
              min="0.01"
              value={goal}
              onChange={setGoal}
              placeholder="e.g., 5"
              required
              helpText="The amount of ETH you aim to raise"
            />

            {/* Deadline */}
            <FormInput
              label="Campaign Deadline"
              type="datetime-local"
              value={deadline}
              onChange={setDeadline}
              required
              helpText="Campaign ends when goal is reached OR deadline passes"
            />

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[#3f8f7b] hover:bg-[#2d7561] disabled:bg-[#9b9b9b] text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : "Create Campaign"}
            </button>

            <p className="text-xs text-[#9b9b9b] text-center">
              By creating a campaign, you agree that funds will be stored on the
              blockchain and can be withdrawn once the goal or deadline is reached.
            </p>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title={walletMissing ? "Connect Wallet" : "Confirm Campaign Creation"}
        onCancel={() => {
          setShowConfirmModal(false);
          setWalletMissing(false);
        }}
        onConfirm={executeCreateCampaign}
        confirmText={walletMissing ? "Connect Wallet" : "Create Campaign"}
        disabled={isProcessing}
        icon={walletMissing ? <WalletIcon /> : undefined}
      >
        {walletMissing ? (
          <p className="text-sm text-[#6b6b6b]">
            You must connect your wallet before creating a campaign.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-[#6b6b6b]">
            <div>
              <strong className="text-[#3b3b3b]">Title:</strong> {title}
            </div>
            <div>
              <strong className="text-[#3b3b3b]">Goal:</strong> {goal} ETH
            </div>
            <div>
              <strong className="text-[#3b3b3b]">Deadline:</strong>{" "}
              {new Date(deadline).toLocaleString()}
            </div>
            <div className="pt-2 border-t border-[#e0e0e0]">
              <p className="text-xs">
                This will create a smart contract transaction. You'll need to
                confirm it in your wallet.
              </p>
            </div>
          </div>
        )}
      </ConfirmModal>

      <ProcessingOverlay isOpen={isProcessing} />
    </main>
  );
}