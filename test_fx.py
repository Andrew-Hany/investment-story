import yfinance as yf
frame1 = yf.download("USDEGP=X", period="5d")
frame2 = yf.download("EGP=X", period="5d")
print("USDEGP=X:")
print(frame1["Close"])
print("EGP=X:")
print(frame2["Close"])
