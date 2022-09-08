// importfunctionalities
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  Keypair
} from "@solana/web3.js";
import {useEffect , useState } from "react";
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// create types
type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
 * @description gets Phantom provider, if it exists
 */
 const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

function App() {
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

	// create state variable for the wallet key
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
  undefined
  );

  // create state variable for the generated solana account
  const [generatedWalletKey, setNewWalletKey] = useState<PublicKey | undefined>(
    undefined
  );

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
	  const provider = getProvider();

		// if the phantom provider exists, set this as the provider
	  if (provider) setProvider(provider);
	  else setProvider(undefined);
  }, []);
  /**
   * @description prompts user to create a wallet to generate a new wallet.
	 * This function is called when the 'create a new solana account' button is clicked
   */
 
  const createWallet = async () => {
      try
      {
        const newPair = Keypair.generate();
        setNewWalletKey(newPair.publicKey);
        await airdropSoltoNewWallet(newPair);
        await checkBalance(newPair);
      }
      catch (err)
      {
        console.log(err);
      }
  };
  /**
   * @description prompts user to connect wallet if it exists.
	 * This function is called when the connect wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;
		// checks if phantom wallet exists
      if (solana) {
      try {
				// connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
        // update walletKey to be the public key
        setWalletKey(response.publicKey.toString());
      } catch (err) {
        console.log(err);
      }
    }
  };

  const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

		// checks if phantom wallet exists
    if (solana) {
      try {
				// disconnects wallet
        await solana.disconnect();
        setWalletKey(undefined);
        if (!solana.isConnected) {
          console.log("You have succesfully disconnected the wallet!");
        }
      } catch (err) {
        console.log(err);
      }
    }
  };
  /**
   * @description prompts user to transfer two sol to connected wallet from the generated wallet.
	 * This function is called when the 'Transfer to new wallet' button is clicked
   */
  const transferSolToWallet = async() => {
    try {
      // @ts-ignore
      const { solana } = window;
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      var response = null;
		  // checks if phantom wallet exists
      if (solana)
      {
        try {
          // check connection wallet and returns response which includes the wallet public key
          response = await solana.connect();
          console.log('wallet account ', response.publicKey.toString());
        } catch (err) {
          console.log(err);
        }
      }
      
      var senderBalance = await connection.getBalance(
          // @ts-ignore
          new PublicKey(generatedWalletKey)
      );
      console.log(`Sender Wallet Balance: ${senderBalance / LAMPORTS_PER_SOL} SOL`);
      console.log(`Sending 2 SOL to receiver's wallet`);

      // Send money from "from" wallet and into "to" wallet
      var transaction = new Transaction().add(
          SystemProgram.transfer({
            //@ts-ignore
              fromPubkey: generatedWalletKey,
              toPubkey: response.publicKey,
              lamports: 2 * LAMPORTS_PER_SOL
          })
      );

      var signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          //@ts-ignore
          [generatedWalletKey]
      );
      console.log("Successfully Sent!");
      console.log('Signature is ', signature.toString());
    } catch (err) {
        console.log(err);
    }
  };

  const airdropSoltoNewWallet = async(newWallet: Keypair) => {
    try{  
        const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

        // Aidrop 2 SOL to Sender wallet
        console.log("Airdopping some SOL to generated wallet: ", newWallet.publicKey.toString());
        const fromAirDropSignature = await connection.requestAirdrop(
            new PublicKey(newWallet.publicKey),
            2 * LAMPORTS_PER_SOL
        );
      
        // Latest blockhash (unique identifer of the block) of the cluster
        let latestBlockHash = await connection.getLatestBlockhash();

        // Confirm transaction using the last valid block height (refers to its time)
        // to check for transaction expiration
        await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: fromAirDropSignature
        });

        console.log("Airdrop completed for the Sender account");
    } catch (err) {
        console.log(err);
    }
};

const checkBalance = async(newWallet: Keypair) => {
  try {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      var newWalletBal = await connection.getBalance(
          new PublicKey(newWallet.publicKey)
      );
      console.log(`Generated Wallet Balance: ${newWalletBal / LAMPORTS_PER_SOL} SOL`);

    } catch (err) {
        console.log(err);
    }
};


	// HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        <h1>
        {provider && walletKey && (
          <button
            style={{
              position: "absolute",
              right: "30px",
              top: "20px",
              fontSize: "14px",
              padding: "12px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={disconnectWallet}
          >
            Disconnect Wallet
          </button>
        )}
        </h1>
        {provider && !generatedWalletKey && (
          <button
            style={{
              fontSize: "14px",
              padding: "12px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createWallet}
          >
            Create a new Solana account
          </button>
        )}
        {provider && generatedWalletKey && <p>Generated Wallet: {generatedWalletKey.toString()}</p>}  
        <h2>Connect to Phantom Wallet</h2>
        {provider && !walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={connectWallet}
          >
            Connect Wallet
          </button>
        )}
        {provider && walletKey && <p>Connected Wallet Address : {walletKey.toString()}</p>}
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
        {provider && walletKey && generatedWalletKey &&(
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={transferSolToWallet}
          >
            Transfer to new wallet
          </button>
        )}
        </header>
    </div>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

export default App;
