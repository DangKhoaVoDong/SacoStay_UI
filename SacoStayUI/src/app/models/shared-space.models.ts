export type SharedSpaceStatus = 'Active' | 'PendingFinalize' | 'Finalized' | string;
export type RoomVoteStatus = 'Like' | 'Dislike' | 'None' | string;

export interface SharedSpaceShortlistItem {
  id: string;
  roomId: string;
  roomTitle: string;
  roomCategory: string;
  price: number;
  address: string;
  isAddedByMe: boolean;
  myVote: RoomVoteStatus;
  partnerVote: RoomVoteStatus;
}

export interface SharedSpaceCurrent {
  id: string;
  myId: string;
  myName: string;
  partnerId: string;
  partnerName: string;
  status: SharedSpaceStatus;
  createdAt: string;
  finalizedRoomId?: string | null;
  finalizeRequestedByUserId?: string | null;
  shortlist: SharedSpaceShortlistItem[];
}

export interface SharedSpaceSummary {
  id: string;
  partnerId: string;
  partnerName: string;
  status: SharedSpaceStatus;
  createdAt: string;
  finalizedRoomId?: string | null;
  shortlistRoomIds: string[];
}

export interface CreateSharedSpacePayload {
  targetUserId: string;
}

export interface AddToShortlistPayload {
  roomId: string;
}

export interface VoteRoomPayload {
  voteStatus: 'Like' | 'Dislike';
}

export interface ProposeFinalizePayload {
  shortlistId: string;
}
