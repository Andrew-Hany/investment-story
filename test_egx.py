import yfinance as yf

# List of potential tickers for the Egyptian index or ETFs
tickers_to_test = [
    "^CASE30",    # Traditional EGX30 index
    "EGX30.CA",   # Sometimes used on regional exchanges
    "EGY",        # VanEck Egypt Index ETF
    "CIRA.CA",    # Example of a regular Egyptian stock to see if the market is accessible
]

print("Testing Yahoo Finance historical data downloads...\n")

for ticker in tickers_to_test:
    print(f"--- Testing {ticker} ---")
    try:
        data = yf.download(ticker, start="2020-01-01", end="2026-05-31", progress=False)
        if len(data) > 0:
            print(f"✅ SUCCESS: Downloaded {len(data)} days of historical data for {ticker}!")
            print(data.tail(3))
        else:
            print(f"❌ FAILED: No historical data returned for {ticker}.")
    except Exception as e:
        print(f"❌ ERROR: Failed to fetch {ticker}. Error: {e}")
    print("\n")
