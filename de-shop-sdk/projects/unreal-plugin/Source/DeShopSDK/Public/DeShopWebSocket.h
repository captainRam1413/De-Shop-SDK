#pragma once

#include "CoreMinimal.h"
#include "WebSocketsModule.h"
#include "IWebSocket.h"
#include "DeShopTypes.h"
#include "DeShopWebSocket.generated.h"

/**
 * Delegate broadcast when the WebSocket connects successfully.
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnWebSocketConnected);

/**
 * Delegate broadcast when the WebSocket disconnects.
 * @param Reason  Human-readable reason string.
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWebSocketDisconnected, FString, Reason);

/**
 * Delegate broadcast when a message is received.
 * @param Message  Structured message containing event type and JSON data.
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWebSocketMessage, FWebSocketMessage, Message);

/**
 * Delegate broadcast when an error occurs.
 * @param ErrorMessage  Human-readable error description.
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWebSocketError, FString, ErrorMessage);

/**
 * WebSocket client for real-time De-Shop events.
 * Supports room subscriptions and automatic reconnection.
 */
UCLASS(BlueprintType)
class UDeShopWebSocket : public UObject
{
    GENERATED_BODY()

public:
    UDeShopWebSocket();
    virtual ~UDeShopWebSocket();

    /** Connect to the De-Shop WebSocket server. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|WebSocket")
    void Connect(const FString& ServerUrl);

    /** Disconnect from the server. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|WebSocket")
    void Disconnect();

    /** Subscribe to a real-time event room. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|WebSocket")
    void SubscribeRoom(const FString& Room);

    /** Unsubscribe from a real-time event room. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|WebSocket")
    void UnsubscribeRoom(const FString& Room);

    /** Called every tick from the game thread to process queued messages. */
    UFUNCTION(BlueprintCallable, Category = "DeShop|WebSocket")
    void ProcessMessages();

    /** Is the socket currently connected? */
    UFUNCTION(BlueprintCallable, BlueprintPure, Category = "DeShop|WebSocket")
    bool IsConnected() const;

public:
    /** Broadcast when connected. */
    UPROPERTY(BlueprintAssignable, Category = "DeShop|WebSocket")
    FOnWebSocketConnected OnConnected;

    /** Broadcast when disconnected. */
    UPROPERTY(BlueprintAssignable, Category = "DeShop|WebSocket")
    FOnWebSocketDisconnected OnDisconnected;

    /** Broadcast on every incoming message. */
    UPROPERTY(BlueprintAssignable, Category = "DeShop|WebSocket")
    FOnWebSocketMessage OnMessage;

    /** Broadcast on error. */
    UPROPERTY(BlueprintAssignable, Category = "DeShop|WebSocket")
    FOnWebSocketError OnError;

private:
    /** Attempt to reconnect (up to MaxReconnectAttempts). */
    void AttemptReconnect();

    /** Internal handlers bound to the IWebSocket callbacks. */
    void OnWebSocketConnected();
    void OnWebSocketConnectionError(const FString& Error);
    void OnWebSocketClosed(int32 StatusCode, const FString& Reason, bool bWasClean);
    void OnWebSocketMessage(const FString& Message);

    /** Send a JSON string over the socket. */
    void SendJson(const TSharedRef<FJsonObject>& JsonObject);

    /** The underlying WebSocket. */
    TSharedPtr<IWebSocket> WebSocket;

    /** Server URL used for reconnection. */
    FString CachedServerUrl;

    /** Rooms the client has subscribed to (re-subscribed on reconnect). */
    TArray<FString> SubscribedRooms;

    /** Queue of messages received on the network thread, drained on game thread. */
    TArray<FWebSocketMessage> MessageQueue;

    /** Critical section for thread-safe message queue access. */
    FCriticalSection MessageQueueLock;

    /** Current reconnect attempt count. */
    int32 ReconnectAttempt = 0;

    /** Maximum number of automatic reconnection attempts. */
    static constexpr int32 MaxReconnectAttempts = 5;

    /** Whether a deliberate disconnect was requested. */
    bool bIntentionalDisconnect = false;
};
