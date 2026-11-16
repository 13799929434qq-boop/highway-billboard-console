package com.gonglu.billboard.service;

import com.gonglu.billboard.config.RedisConfig;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;

import static org.junit.jupiter.api.Assertions.*;

class RedisIntegrationTest {
    @Test
    @EnabledIfEnvironmentVariable(named = "RUN_REDIS_INTEGRATION", matches = "true")
    void cacheWritesReadsAndExpires() {
        LettuceConnectionFactory factory = new LettuceConnectionFactory("127.0.0.1", 6379);
        factory.afterPropertiesSet();
        factory.start();
        RedisTemplate<String, Object> template = new RedisConfig().redisTemplate(factory);
        CacheService cache = new CacheService(template);
        String key = "billboard:integration-test:" + UUID.randomUUID();
        try {
            cache.set(key, "verified", Duration.ofMinutes(1));
            assertEquals("verified", cache.get(key));
            assertTrue(template.getExpire(key) > 0);
            cache.evict(key);
            assertNull(cache.get(key));
        } finally {
            template.delete(key);
            factory.destroy();
        }
    }
}
