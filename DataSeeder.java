package com.cinevault.config;

import com.cinevault.entity.Movie;
import com.cinevault.entity.User;
import com.cinevault.repository.MovieRepository;
import com.cinevault.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${cinevault.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void run(String... args) throws Exception {
        // 1. Create upload directories
        Files.createDirectories(Paths.get(uploadDir, "posters"));
        Files.createDirectories(Paths.get(uploadDir, "videos"));

        // 2. Create Admin user if not present
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User(
                    "admin",
                    "admin@cinevault.com",
                    passwordEncoder.encode("admin123"),
                    "ROLE_ADMIN"
            );
            userRepository.save(admin);
            System.out.println(">>> Seeded default ADMIN user: admin / admin123");
        }

        // 3. Create regular user if not present
        if (!userRepository.existsByUsername("user")) {
            User user = new User(
                    "user",
                    "user@cinevault.com",
                    passwordEncoder.encode("user123"),
                    "ROLE_USER"
            );
            userRepository.save(user);
            System.out.println(">>> Seeded default USER: user / user123");
        }

        // 4. Seed sample movies if library is empty
        if (movieRepository.count() == 0) {
            List<Movie> sampleMovies = Arrays.asList(
                new Movie(
                    "Cyber Horizon 2099",
                    "In a neon-drenched metropolis controlled by rogue artificial intelligence, a solitary hacker discovers a secret code capable of liberating humanity from total digital dominance.",
                    "Sci-Fi",
                    "English",
                    2026,
                    "2h 18m",
                    8.9,
                    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
                ),
                new Movie(
                    "Shadow of the Syndicate",
                    "An undercover agent infiltrates an elite international syndicate, testing his loyalty and sanity as betrayal threatens to unravel everything he stood for.",
                    "Action",
                    "English",
                    2026,
                    "2h 05m",
                    8.6,
                    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
                ),
                new Movie(
                    "Chronicles of Aethelgard",
                    "When the ancient sun rune is shattered, a reluctant knight and a rebellious sorceress embark on an epic quest through mystical realms to save their world from eternal night.",
                    "Fantasy",
                    "English",
                    2025,
                    "2h 42m",
                    9.1,
                    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                ),
                new Movie(
                    "Echoes in the Deep",
                    "A deep-sea research crew stumbles upon an alien structure buried beneath the ocean trench, uncovering truths that shatter human history.",
                    "Horror",
                    "English",
                    2026,
                    "1h 54m",
                    8.3,
                    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
                ),
                new Movie(
                    "Velocity Drift",
                    "High-octane underground racing meets heist thrillers as a crew of rogue drivers plan the ultimate vault robbery on a moving super-train.",
                    "Action",
                    "English",
                    2025,
                    "1h 48m",
                    8.4,
                    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                ),
                new Movie(
                    "The Last Symphony",
                    "A prodigy pianist confronting memory loss races against time to compose a masterpiece that will reunite his estranged family.",
                    "Drama",
                    "French",
                    2024,
                    "2h 10m",
                    8.7,
                    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
                ),
                new Movie(
                    "Starlight Odyssey",
                    "A crew of explorers ventures beyond the solar system on a sub-light speed voyage, facing time dilation and emotional trials.",
                    "Sci-Fi",
                    "English",
                    2026,
                    "2h 35m",
                    9.3,
                    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
                ),
                new Movie(
                    "Neon Heist",
                    "In a Tokyo of the future, five specialized operatives aim to steal the world's most valuable quantum processor from a fortified tower.",
                    "Thriller",
                    "Japanese",
                    2025,
                    "2h 02m",
                    8.5,
                    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
                )
            );

            movieRepository.saveAll(sampleMovies);
            System.out.println(">>> Seeded 8 sample movies with video streams into CineVault database.");
        }
    }
}
