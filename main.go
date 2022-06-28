package main

import (
	"embed"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

// content holds our static web server content.
//go:embed js/* css/* *.html
var content embed.FS

const ListenAddrEnvVar = "CASTDECK_LISTEN_ADDR"

func main() {
	// if we add more args, use something like urfavcli, but for just one
	// we avoid the dep
	listenAddr := os.Getenv(ListenAddrEnvVar)
	switch listenAddr {
	case "":
		listenAddr = "0.0.0.0:8080"
		log.Print("No address provided via ", ListenAddrEnvVar, ", defaulting to", listenAddr)
	default:
		log.Print("Overriding listen address found in ", ListenAddrEnvVar, " to ", listenAddr)
	}

	router := mux.NewRouter()
	router.PathPrefix("/").Handler(http.StripPrefix("/", http.FileServer(http.FS(content))))
	handler := handlers.CompressHandler(router)
	handler = handlers.RecoveryHandler(handlers.PrintRecoveryStack(true))(handler)
	handler = handlers.LoggingHandler(os.Stdout, handler)
	httpServer := &http.Server{
		Addr:              listenAddr,
		Handler:           handler,
		MaxHeaderBytes:    1 << 20,
		ReadHeaderTimeout: 10 * time.Second,
	}
	if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatal("http server terminated", zap.Error(err))
	}
}
