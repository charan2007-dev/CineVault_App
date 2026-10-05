package com.cinevault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CineVaultApplication {

    public static void main(String[] args) {
        SpringApplication.run(CineVaultApplication.class, args);
        System.out.println("\n=======================================================");
        System.out.println(" 🎬 CineVault Application Started Successfully!");
        System.out.println(" Access Web App: http://localhost:8080");
        System.out.println(" Admin Credentials: admin / admin123");
        System.out.println(" User Credentials: user / user123");
        System.out.println("=======================================================\n");
    }
}
