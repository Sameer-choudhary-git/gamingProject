import Board from "@/engines/stockfishUtils/Board"; // Adjust path to where you save Board.tsx

interface PageProps {
  params: {
    gameId: string;
  };
}

export default function ChessPage({ params }: PageProps) {
  // In Next.js App Router, params are passed as props
  // We pass the ID down to the client component
  return <Board gameId={params.gameId} />;
}