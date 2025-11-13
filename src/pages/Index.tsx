import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Import crypto icons
import btcIcon from "@/assets/btc-icon.png";
import ltcIcon from "@/assets/ltc-icon.png";
import ethIcon from "@/assets/eth-icon.png";
import solIcon from "@/assets/sol-icon.png";

// Card types and suits
type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface PlayingCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

interface GameRound {
  result: "win" | "lose" | "push" | "blackjack";
  amount: number;
}

type CryptoType = "BTC" | "LTC" | "ETH" | "SOL";

interface CryptoBalance {
  BTC: number;
  LTC: number;
  ETH: number;
  SOL: number;
}

interface WagerTracking {
  BTC: { deposited: number; wagered: number };
  LTC: { deposited: number; wagered: number };
  ETH: { deposited: number; wagered: number };
  SOL: { deposited: number; wagered: number };
}

interface CryptoPrices {
  BTC: number;
  LTC: number;
  ETH: number;
  SOL: number;
}

const Index = () => {
  // Game state
  const [balances, setBalances] = useState<CryptoBalance>({
    BTC: 0,
    LTC: 0,
    ETH: 0,
    SOL: 0,
  });
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>("BTC");
  const [wagerTracking, setWagerTracking] = useState<WagerTracking>({
    BTC: { deposited: 0, wagered: 0 },
    LTC: { deposited: 0, wagered: 0 },
    ETH: { deposited: 0, wagered: 0 },
    SOL: { deposited: 0, wagered: 0 },
  });
  const [showUSD, setShowUSD] = useState(false);
  const [betInUSD, setBetInUSD] = useState(false);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrices>({
    BTC: 97000,
    LTC: 88,
    ETH: 3600,
    SOL: 210,
  });

  // Fetch crypto prices from CoinGecko
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,ethereum,solana&vs_currencies=usd'
        );
        const data = await response.json();
        setCryptoPrices({
          BTC: data.bitcoin.usd,
          LTC: data.litecoin.usd,
          ETH: data.ethereum.usd,
          SOL: data.solana.usd,
        });
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);

    return () => clearInterval(interval);
  }, []);

  // Deposit/Withdraw states
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Blackjack game state
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [bet, setBet] = useState(0.001);
  const [gameState, setGameState] = useState<"idle" | "playing" | "dealer" | "finished">("idle");
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [canDouble, setCanDouble] = useState(false);
  const [roundHistory, setRoundHistory] = useState<GameRound[]>([]);

  const balance = balances[selectedCrypto];

  // Reset round history when crypto changes
  useEffect(() => {
    setRoundHistory([]);
  }, [selectedCrypto]);

  // Create a shuffled deck
  const createDeck = (): PlayingCard[] => {
    const suits: Suit[] = ["♠", "♥", "♦", "♣"];
    const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const newDeck: PlayingCard[] = [];

    // 6 decks
    for (let d = 0; d < 6; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          newDeck.push({ suit, rank, id: `${suit}${rank}${d}` });
        }
      }
    }

    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return newDeck;
  };

  // Calculate hand value
  const calculateHandValue = (hand: PlayingCard[]): number => {
    let value = 0;
    let aces = 0;

    hand.forEach((card) => {
      if (card.rank === "A") {
        aces += 1;
        value += 11;
      } else if (["K", "Q", "J"].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    });

    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }

    return value;
  };

  // Deposit handler
  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] + amount }));
    setWagerTracking(prev => ({
      ...prev,
      [selectedCrypto]: {
        ...prev[selectedCrypto],
        deposited: prev[selectedCrypto].deposited + amount
      }
    }));
    setDepositAmount("");
    setDepositDialogOpen(false);
    toast({
      title: "Deposit Successful",
      description: `Added ${amount} ${selectedCrypto} to your balance.`,
    });
  };

  // Withdraw handler
  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawAddress || withdrawAddress.trim() === "") {
      toast({
        title: "Address Required",
        description: "Please enter a withdrawal address.",
        variant: "destructive",
      });
      return;
    }

    const currentBalance = balances[selectedCrypto];
    const { deposited, wagered } = wagerTracking[selectedCrypto];
    const requiredWager = deposited * 50;
    const remainingWager = Math.max(0, requiredWager - wagered);

    if (remainingWager > 0) {
      toast({
        title: "Wager Requirement Not Met",
        description: `You need to wager ${remainingWager.toFixed(6)} ${selectedCrypto} more (${(remainingWager * cryptoPrices[selectedCrypto]).toFixed(2)} USD) before withdrawing.`,
        variant: "destructive",
      });
      return;
    }

    if (amount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${selectedCrypto} to withdraw.`,
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] - amount }));
    setWagerTracking(prev => ({
      ...prev,
      [selectedCrypto]: {
        deposited: 0,
        wagered: 0
      }
    }));
    setWithdrawAmount("");
    setWithdrawAddress("");
    setWithdrawDialogOpen(false);
    toast({
      title: "Withdrawal Successful",
      description: `Sent ${amount} ${selectedCrypto} to ${withdrawAddress.substring(0, 10)}...`,
    });
  };

  // Get deposit address
  const getDepositAddress = () => {
    const addresses: Record<CryptoType, string> = {
      BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      LTC: "ltc1qhf5w9h2jwm8zx4c3q2p0yrf2493p83kkfjhx0wlh",
      ETH: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
      SOL: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    };
    return addresses[selectedCrypto];
  };

  // End round
  const endRound = (result: "win" | "lose" | "push" | "blackjack") => {
    let payout = 0;
    let resultMessage = "";

    if (result === "blackjack") {
      payout = bet * 2.5;
      resultMessage = "Blackjack! You Win!";
    } else if (result === "win") {
      payout = bet * 2;
      resultMessage = "You Win!";
    } else if (result === "push") {
      payout = bet; // Return the bet on push
      resultMessage = "Push - Tie Game";
    } else {
      payout = 0; // Player loses - they already lost their bet
      resultMessage = "Dealer Wins";
    }

    const profit = payout - bet;
    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] + payout }));
    setWagerTracking(prev => ({
      ...prev,
      [selectedCrypto]: {
        ...prev[selectedCrypto],
        wagered: prev[selectedCrypto].wagered + bet
      }
    }));
    setRoundHistory(prev => [{ result, amount: profit }, ...prev].slice(0, 20));
    setMessage(resultMessage);
    setGameState("finished");
  };

  // Start new round
  const newRound = () => {
    if (bet > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this bet.",
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] - bet }));
    
    const newDeck = deck.length < 52 ? createDeck() : [...deck];
    const newPlayerHand = [newDeck.pop()!, newDeck.pop()!];
    const newDealerHand = [newDeck.pop()!, newDeck.pop()!];

    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setDealerRevealed(false);
    setMessage("");
    setGameState("playing");
    setCanDouble(true);

    // Check for blackjack
    const playerValue = calculateHandValue(newPlayerHand);
    const dealerValue = calculateHandValue(newDealerHand);

    if (playerValue === 21) {
      if (dealerValue === 21) {
        setDealerRevealed(true);
        endRound("push");
      } else {
        setDealerRevealed(true);
        endRound("blackjack");
      }
    }
  };

  // Player hits
  const hit = () => {
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    setDeck(newDeck);
    setPlayerHand(newHand);
    setCanDouble(false);

    const value = calculateHandValue(newHand);
    if (value > 21) {
      setDealerRevealed(true);
      endRound("lose");
    }
  };

  // Player stands
  const stand = () => {
    setGameState("dealer");
    setDealerRevealed(true);
    playDealerHand();
  };

  // Double down
  const doubleDown = () => {
    if (bet * 2 > balance + bet) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to double down.",
        variant: "destructive",
      });
      return;
    }

    // Deduct the additional bet amount
    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] - bet }));
    setBet(bet * 2); // Double the bet

    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    setDeck(newDeck);
    setPlayerHand(newHand);

    const value = calculateHandValue(newHand);
    if (value > 21) {
      setDealerRevealed(true);
      endRound("lose"); // Player loses double the bet
    } else {
      setGameState("dealer");
      setDealerRevealed(true);
      setTimeout(() => playDealerHand(newHand), 500);
    }
  };

  // Dealer plays
  const playDealerHand = (finalPlayerHand?: PlayingCard[]) => {
    const playerValue = calculateHandValue(finalPlayerHand || playerHand);
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];

    while (calculateHandValue(currentDealerHand) < 17) {
      const newCard = currentDeck.pop()!;
      currentDealerHand.push(newCard);
      setDealerHand([...currentDealerHand]);
      setDeck([...currentDeck]);
    }

    const dealerValue = calculateHandValue(currentDealerHand);

    setTimeout(() => {
      if (dealerValue > 21 || playerValue > dealerValue) {
        endRound("win");
      } else if (playerValue === dealerValue) {
        endRound("push");
      } else {
        endRound("lose");
      }
    }, 500);
  };

  // Copy address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(getDepositAddress());
    setCopiedAddress(true);
    toast({
      title: "Address Copied",
      description: "Deposit address copied to clipboard.",
    });
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Render card
  const renderCard = (card: PlayingCard, hidden: boolean = false) => {
    const isRed = card.suit === "♥" || card.suit === "♦";
    
    if (hidden) {
      return (
        <div className="w-20 h-28 bg-primary rounded-lg border-2 border-primary-foreground flex items-center justify-center">
          <div className="text-4xl">🂠</div>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ duration: 0.3 }}
        className="w-20 h-28 bg-card rounded-lg border-2 border-border flex flex-col items-center justify-center p-2"
      >
        <div className={`text-2xl font-bold ${isRed ? "text-red-500" : "text-foreground"}`}>
          {card.rank}
        </div>
        <div className={`text-3xl ${isRed ? "text-red-500" : "text-foreground"}`}>
          {card.suit}
        </div>
      </motion.div>
    );
  };

  // Get crypto icon
  const getCryptoIcon = () => {
    switch (selectedCrypto) {
      case "BTC":
        return btcIcon;
      case "LTC":
        return ltcIcon;
      case "ETH":
        return ethIcon;
      case "SOL":
        return solIcon;
    }
  };

  // Format balance
  const formatBalance = (amount: number) => {
    if (showUSD) {
      return `$${(amount * cryptoPrices[selectedCrypto]).toFixed(2)}`;
    }
    return `${amount.toFixed(8)} ${selectedCrypto}`;
  };

  // Format bet amount
  const formatBetAmount = (amount: number) => {
    if (betInUSD) {
      const usdAmount = amount * cryptoPrices[selectedCrypto];
      const cryptoAmount = usdAmount / cryptoPrices[selectedCrypto];
      return `$${usdAmount.toFixed(2)} (${cryptoAmount.toFixed(8)} ${selectedCrypto})`;
    }
    return `${amount.toFixed(8)} ${selectedCrypto}`;
  };

  // Calculate profit chart data
  const profitChartData = roundHistory.slice().reverse().map((round, index) => ({
    game: index + 1,
    profit: round.amount * cryptoPrices[selectedCrypto],
  }));

  // Calculate total profit
  const totalProfit = roundHistory.reduce((sum, round) => sum + round.amount, 0);
  const totalProfitUSD = totalProfit * cryptoPrices[selectedCrypto];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Crypto Blackjack</h1>
            <p className="text-muted-foreground">Play blackjack with cryptocurrency</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedCrypto} onValueChange={(value: CryptoType) => setSelectedCrypto(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC">
                  <div className="flex items-center gap-2">
                    <img src={btcIcon} alt="BTC" className="w-5 h-5" />
                    BTC
                  </div>
                </SelectItem>
                <SelectItem value="LTC">
                  <div className="flex items-center gap-2">
                    <img src={ltcIcon} alt="LTC" className="w-5 h-5" />
                    LTC
                  </div>
                </SelectItem>
                <SelectItem value="ETH">
                  <div className="flex items-center gap-2">
                    <img src={ethIcon} alt="ETH" className="w-5 h-5" />
                    ETH
                  </div>
                </SelectItem>
                <SelectItem value="SOL">
                  <div className="flex items-center gap-2">
                    <img src={solIcon} alt="SOL" className="w-5 h-5" />
                    SOL
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Balance and Deposit/Withdraw */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src={getCryptoIcon()} alt={selectedCrypto} className="w-10 h-10" />
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold">{formatBalance(balance)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUSD(!showUSD)}
                    className="text-xs"
                  >
                    Show in {showUSD ? selectedCrypto : "USD"}
                  </Button>
                </div>
              </div>
              
              {/* Wager tracking */}
              <div className="text-xs text-muted-foreground mt-2">
                <p>Deposited: {wagerTracking[selectedCrypto].deposited.toFixed(6)} {selectedCrypto}</p>
                <p>Wagered: {wagerTracking[selectedCrypto].wagered.toFixed(6)} {selectedCrypto}</p>
                <p>Required: {(wagerTracking[selectedCrypto].deposited * 50).toFixed(6)} {selectedCrypto}</p>
                <p>Remaining: {Math.max(0, (wagerTracking[selectedCrypto].deposited * 50) - wagerTracking[selectedCrypto].wagered).toFixed(6)} {selectedCrypto}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default">Deposit</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Deposit {selectedCrypto}</DialogTitle>
                    <DialogDescription>
                      Send {selectedCrypto} to the address below or enter an amount to simulate a deposit.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Deposit Address</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input value={getDepositAddress()} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={copyAddress}>
                          {copiedAddress ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Simulate Deposit</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button onClick={handleDeposit} className="w-full">
                      Confirm Deposit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Withdraw</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Withdraw {selectedCrypto}</DialogTitle>
                    <DialogDescription>
                      Enter the amount and address to withdraw your {selectedCrypto}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Withdrawal Address</Label>
                      <Input
                        type="text"
                        placeholder={`Enter ${selectedCrypto} address`}
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                        className="mt-2 font-mono text-sm"
                      />
                    </div>
                    <Button onClick={handleWithdraw} className="w-full">
                      Confirm Withdrawal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dealer Hand */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Dealer</h2>
                  {dealerHand.length > 0 && (
                    <p className="text-lg">
                      {dealerRevealed ? calculateHandValue(dealerHand) : "?"}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {dealerHand.map((card, index) => (
                    <div key={card.id}>
                      {renderCard(card, index === 1 && !dealerRevealed)}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Player Hand */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Player</h2>
                  {playerHand.length > 0 && (
                    <p className="text-lg font-bold">{calculateHandValue(playerHand)}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {playerHand.map((card) => (
                    <div key={card.id}>{renderCard(card)}</div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Game Controls */}
            <Card className="p-6">
              <div className="space-y-4">
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-xl font-bold text-primary"
                  >
                    {message}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label>Bet Amount</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.00001"
                      value={bet}
                      onChange={(e) => setBet(parseFloat(e.target.value) || 0.001)}
                      disabled={gameState === "playing" || gameState === "dealer"}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetInUSD(!betInUSD)}
                    >
                      {betInUSD ? "USD" : selectedCrypto}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBetAmount(bet)}
                  </p>
                </div>

                {gameState === "idle" || gameState === "finished" ? (
                  <Button onClick={newRound} className="w-full" size="lg">
                    Deal
                  </Button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={hit}
                      disabled={gameState !== "playing"}
                      variant="default"
                    >
                      Hit
                    </Button>
                    <Button
                      onClick={stand}
                      disabled={gameState !== "playing"}
                      variant="secondary"
                    >
                      Stand
                    </Button>
                    <Button
                      onClick={doubleDown}
                      disabled={!canDouble || gameState !== "playing"}
                      variant="outline"
                    >
                      Double
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Total Profit */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Profit</h3>
              <div className="flex items-center gap-2">
                {totalProfit >= 0 ? (
                  <TrendingUp className="text-green-500" />
                ) : (
                  <TrendingDown className="text-red-500" />
                )}
                <div>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    ${totalProfitUSD.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {totalProfit.toFixed(8)} {selectedCrypto}
                  </p>
                </div>
              </div>
            </Card>

            {/* Profit Chart */}
            {roundHistory.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Profit Chart</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={profitChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="game" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Recent Games */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Last 10 Bets</h3>
              <div className="space-y-2">
                {roundHistory.slice(0, 10).map((round, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 rounded bg-muted"
                  >
                    <span className="text-sm capitalize">{round.result}</span>
                    <span
                      className={`text-sm font-bold ${
                        round.amount >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {round.amount >= 0 ? "+" : ""}
                      {round.amount.toFixed(8)} {selectedCrypto}
                    </span>
                  </div>
                ))}
                {roundHistory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No games played yet
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
