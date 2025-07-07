import { CampaignDetailClient } from './campaign-detail-client'

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return <CampaignDetailClient campaignId={params.id} />
}