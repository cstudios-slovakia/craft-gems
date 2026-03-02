<?php

namespace gemini\craftgems\models;

use craft\base\Model;

class Settings extends Model
{
    public string $apiKey = '';
    public array $gems = [];

    public function rules(): array
    {
        return [
            ['apiKey', 'string'],
            ['apiKey', 'required'],
            ['gems', 'safe'],
        ];
    }
}
